import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import type { Principal, ToggleReactionRequest } from '@wildtails/contracts';
import { ToggleReactionRequestSchema } from '@wildtails/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ReactionService } from './reaction.service';

@Controller('posts/:postId/reactions')
export class ReactionController {
  constructor(private readonly reactionService: ReactionService) {}

  /**
   * POST /posts/:postId/reactions
   * Toggles the caller's reaction. type is server-validated.
   * Self-reaction is allowed but does not generate influence points (D28).
   */
  @Post()
  async toggle(
    @Param('postId') postId: string,
    @Body(new ZodValidationPipe(ToggleReactionRequestSchema)) dto: ToggleReactionRequest,
    @CurrentUser() user: Principal,
  ) {
    const data = await this.reactionService.toggle(postId, user.userId, dto.type);
    return { success: true, data };
  }

  /**
   * GET /posts/:postId/reactions
   * Returns reaction counts and the caller's current reaction.
   */
  @Get()
  async getCounts(@Param('postId') postId: string, @CurrentUser() user: Principal) {
    const data = await this.reactionService.getCounts(postId, user.userId);
    return { success: true, data };
  }
}
