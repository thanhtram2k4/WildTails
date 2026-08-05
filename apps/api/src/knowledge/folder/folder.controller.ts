import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import type { Principal } from '@wildtails/contracts';
import { CreateFolderRequestSchema, UpdateFolderRequestSchema } from '@wildtails/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { FolderService } from './folder.service';

@Controller('folders')
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateFolderRequestSchema)) dto: import('@wildtails/contracts').CreateFolderRequest,
    @CurrentUser() user: Principal,
  ) {
    const data = await this.folderService.create(user.userId, dto);
    return { success: true, data };
  }

  @Get()
  async list(
    @CurrentUser() user: Principal,
    @Query('cursor') cursor?: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit = Math.min(Math.max(parseInt(limitStr || '20', 10) || 20, 1), 100);
    const result = await this.folderService.list(user.userId, { cursor, limit });
    return { success: true, data: result.data, meta: result.meta };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateFolderRequestSchema)) dto: import('@wildtails/contracts').UpdateFolderRequest,
    @CurrentUser() user: Principal,
  ) {
    const data = await this.folderService.update(id, user.userId, dto);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: Principal) {
    const data = await this.folderService.remove(id, user.userId);
    return { success: true, data };
  }
}
