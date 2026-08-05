import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import type { Principal } from '@wildtails/contracts';
import { CreateTagRequestSchema } from '@wildtails/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { TagService } from './tag.service';

@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateTagRequestSchema)) dto: { name: string },
    @CurrentUser() user: Principal,
  ) {
    const data = await this.tagService.create(user.userId, dto.name);
    return { success: true, data };
  }

  @Get()
  async list(@CurrentUser() user: Principal) {
    const data = await this.tagService.list(user.userId);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: Principal) {
    const data = await this.tagService.remove(id, user.userId);
    return { success: true, data };
  }
}
