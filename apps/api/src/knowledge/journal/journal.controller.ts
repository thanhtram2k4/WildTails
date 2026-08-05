import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import type { Principal } from '@wildtails/contracts';
import { CreateJournalRequestSchema, UpdateJournalRequestSchema } from '@wildtails/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JournalService } from './journal.service';

@Controller('journals')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateJournalRequestSchema)) dto: import('@wildtails/contracts').CreateJournalRequest,
    @CurrentUser() user: Principal,
  ) {
    const data = await this.journalService.create(user.userId, dto);
    return { success: true, data };
  }

  @Get()
  async list(
    @CurrentUser() user: Principal,
    @Query('cursor') cursor?: string,
    @Query('limit') limitStr?: string,
    @Query('folderId') folderId?: string,
    @Query('tagId') tagId?: string,
    @Query('goalId') goalId?: string,
  ) {
    const limit = Math.min(Math.max(parseInt(limitStr || '20', 10) || 20, 1), 100);
    const result = await this.journalService.list(user.userId, {
      cursor,
      limit,
      folderId,
      tagId,
      goalId,
    });
    return { success: true, data: result.data, meta: result.meta };
  }

  @Get(':id')
  async findById(@Param('id') id: string, @CurrentUser() user: Principal) {
    const data = await this.journalService.findById(id, user.userId);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateJournalRequestSchema)) dto: import('@wildtails/contracts').UpdateJournalRequest,
    @CurrentUser() user: Principal,
  ) {
    const data = await this.journalService.update(id, user.userId, dto);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: Principal) {
    const data = await this.journalService.softDelete(id, user.userId);
    return { success: true, data };
  }

  @Get(':id/versions')
  async listVersions(@Param('id') id: string, @CurrentUser() user: Principal) {
    const data = await this.journalService.listVersions(id, user.userId);
    return { success: true, data };
  }
}
