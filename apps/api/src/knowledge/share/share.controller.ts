import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import type { Principal } from '@wildtails/contracts';
import { CreateSharePermissionRequestSchema } from '@wildtails/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ShareService } from './share.service';

@Controller('journals')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Post(':id/share')
  async grant(
    @Param('id') journalId: string,
    @Body(new ZodValidationPipe(CreateSharePermissionRequestSchema))
    dto: { journalId?: string; userId: string; expiresAt?: string },
    @CurrentUser() user: Principal,
  ) {
    const data = await this.shareService.grant(journalId, user.userId, dto.userId, dto.expiresAt);
    return { success: true, data };
  }

  @Get(':id/shares')
  async listActive(@Param('id') journalId: string, @CurrentUser() user: Principal) {
    const data = await this.shareService.listActive(journalId, user.userId);
    return { success: true, data };
  }

  @Delete(':id/share/:permissionId')
  async revoke(
    @Param('id') journalId: string,
    @Param('permissionId') permissionId: string,
    @CurrentUser() user: Principal,
  ) {
    const data = await this.shareService.revoke(journalId, permissionId, user.userId);
    return { success: true, data };
  }
}
