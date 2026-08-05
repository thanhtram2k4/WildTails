import { Controller, Post, Delete, Get, Param, Query } from '@nestjs/common';
import type { Principal } from '@wildtails/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SavedPostService } from './saved-post.service';

@Controller()
export class SavedPostController {
  constructor(private readonly savedPostService: SavedPostService) {}

  /**
   * POST /posts/:postId/save
   * Saves a post for later. Requires active planet membership.
   * Self-save is allowed (D28).
   */
  @Post('posts/:postId/save')
  async save(@Param('postId') postId: string, @CurrentUser() user: Principal) {
    const data = await this.savedPostService.save(postId, user.userId);
    return { success: true, data };
  }

  /**
   * DELETE /posts/:postId/save
   * Removes a saved post. 404 if not previously saved.
   */
  @Delete('posts/:postId/save')
  async unsave(@Param('postId') postId: string, @CurrentUser() user: Principal) {
    const data = await this.savedPostService.unsave(postId, user.userId);
    return { success: true, data };
  }

  /**
   * GET /saved-posts
   * Lists the caller's saved posts with embedded PostResponse.
   */
  @Get('saved-posts')
  async list(
    @CurrentUser() user: Principal,
    @Query('cursor') cursor?: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit = Math.min(Math.max(parseInt(limitStr ?? '20', 10) || 20, 1), 100);
    const result = await this.savedPostService.list(user.userId, cursor, limit);
    return { success: true, data: result.data, meta: result.meta };
  }
}
