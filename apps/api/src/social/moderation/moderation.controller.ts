import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import type { Principal, ReviewReportRequest } from '@wildtails/contracts';
import { ReviewReportRequestSchema } from '@wildtails/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ModerationService } from './moderation.service';

@Controller()
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  /**
   * GET /planets/:planetId/reports
   * Lists reports for a planet's moderation queue.
   * Requires planet MODERATOR/ADMIN/OWNER role or platform ADMIN.
   */
  @Get('planets/:planetId/reports')
  async listPlanetReports(
    @Param('planetId') planetId: string,
    @CurrentUser() user: Principal,
    @Query('cursor') cursor?: string,
    @Query('limit') limitStr?: string,
    @Query('status') statusFilter?: string,
  ) {
    const limit = Math.min(Math.max(parseInt(limitStr ?? '20', 10) || 20, 1), 100);
    const result = await this.moderationService.listPlanetReports(
      planetId,
      user.userId,
      user.role,
      cursor,
      limit,
      statusFilter,
    );
    return { success: true, data: result.data, meta: result.meta };
  }

  /**
   * PATCH /reports/:id
   * Reviews a report. Only processes PENDING reports; returns 409 if already processed.
   * Moderation action is atomic: report update + content hide + AuditLog.
   */
  @Patch('reports/:id')
  async reviewReport(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReviewReportRequestSchema)) dto: ReviewReportRequest,
    @CurrentUser() user: Principal,
  ) {
    const data = await this.moderationService.reviewReport(id, user.userId, user.role, dto);
    return { success: true, data };
  }
}
