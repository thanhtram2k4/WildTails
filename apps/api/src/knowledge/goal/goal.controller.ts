import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import type { Principal } from '@wildtails/contracts';
import { CreateGoalRequestSchema, UpdateGoalRequestSchema } from '@wildtails/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GoalService } from './goal.service';

@Controller('goals')
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateGoalRequestSchema)) dto: import('@wildtails/contracts').CreateGoalRequest,
    @CurrentUser() user: Principal,
  ) {
    const data = await this.goalService.create(user.userId, dto);
    return { success: true, data };
  }

  @Get()
  async list(
    @CurrentUser() user: Principal,
    @Query('cursor') cursor?: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit = Math.min(Math.max(parseInt(limitStr || '20', 10) || 20, 1), 100);
    const result = await this.goalService.list(user.userId, { cursor, limit });
    return { success: true, data: result.data, meta: result.meta };
  }

  @Get(':id')
  async findById(@Param('id') id: string, @CurrentUser() user: Principal) {
    const data = await this.goalService.findById(id, user.userId);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateGoalRequestSchema)) dto: import('@wildtails/contracts').UpdateGoalRequest,
    @CurrentUser() user: Principal,
  ) {
    const data = await this.goalService.update(id, user.userId, dto);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: Principal) {
    const data = await this.goalService.remove(id, user.userId);
    return { success: true, data };
  }
}
