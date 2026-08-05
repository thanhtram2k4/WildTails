import { Controller, Post, Get, Delete, Param, Body, Query } from '@nestjs/common';
import type { Principal, CreateCommentRequest } from '@wildtails/contracts';
import { CreateCommentRequestSchema } from '@wildtails/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CommentService } from './comment.service';

@Controller()
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  /**
   * POST /posts/:postId/comments
   * Creates a comment on a post. Requires active planet membership.
   */
  @Post('posts/:postId/comments')
  async create(
    @Param('postId') postId: string,
    @Body(new ZodValidationPipe(CreateCommentRequestSchema)) dto: CreateCommentRequest,
    @CurrentUser() user: Principal,
  ) {
    const data = await this.commentService.create(postId, user.userId, dto);
    return { success: true, data };
  }

  /**
   * GET /posts/:postId/comments
   * Paginated list of comments. Requires active planet membership.
   */
  @Get('posts/:postId/comments')
  async list(
    @Param('postId') postId: string,
    @CurrentUser() user: Principal,
    @Query('cursor') cursor?: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit = Math.min(Math.max(parseInt(limitStr ?? '20', 10) || 20, 1), 100);
    const result = await this.commentService.list(postId, user.userId, cursor, limit);
    return { success: true, data: result.data, meta: result.meta };
  }

  /**
   * DELETE /comments/:id
   * Owner-only soft delete. Former members may delete their own comments.
   */
  @Delete('comments/:id')
  async deleteByOwner(@Param('id') id: string, @CurrentUser() user: Principal) {
    const data = await this.commentService.deleteByOwner(id, user.userId);
    return { success: true, data };
  }
}
