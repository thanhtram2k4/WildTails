import { Controller, Post, Body } from '@nestjs/common';
import type { Principal, CreateReportRequest } from '@wildtails/contracts';
import { CreateReportRequestSchema } from '@wildtails/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ReportService } from './report.service';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  /**
   * POST /reports
   * Creates a moderation report.
   * planetId and reporter identity are derived server-side — never from client.
   */
  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateReportRequestSchema)) dto: CreateReportRequest,
    @CurrentUser() user: Principal,
  ) {
    const data = await this.reportService.create(user.userId, dto);
    return { success: true, data };
  }
}
