import { Controller, Post, Get, Delete, Param, Body, Query } from '@nestjs/common';
import type { Principal } from '@wildtails/contracts';
import { CreatePostRequestSchema } from '@wildtails/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PostService } from './post.service';
import type { CreatePostRequest } from '@wildtails/contracts';

@Controller()
export class PostController {
  constructor(private readonly postService: PostService) {}

  /**
   * POST /posts
   * Creates a new post on a planet feed.
   * planetId is taken from the request body; owner and type are server-authoritative.
   */
  @Post('posts')
  async create(
    @Body(new ZodValidationPipe(CreatePostRequestSchema)) dto: CreatePostRequest,
    @CurrentUser() user: Principal,
  ) {
    const data = await this.postService.create(user.userId, dto);
    return { success: true, data };
  }

  /**
   * GET /planets/:planetId/posts
   * Paginated planet feed. Requires active membership.
   */
  @Get('planets/:planetId/posts')
  async listFeed(
    @Param('planetId') planetId: string,
    @CurrentUser() user: Principal,
    @Query('cursor') cursor?: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit = Math.min(Math.max(parseInt(limitStr ?? '20', 10) || 20, 1), 100);
    const result = await this.postService.listFeed(planetId, user.userId, cursor, limit);
    return { success: true, data: result.data, meta: result.meta };
  }

  /**
   * GET /posts/:id
   * Returns a single post. Requires active membership on the post's planet.
   * Privacy-safe 404 on unauthorized access.
   */
  @Get('posts/:id')
  async findById(@Param('id') id: string, @CurrentUser() user: Principal) {
    const data = await this.postService.findById(id, user.userId);
    return { success: true, data };
  }

  /**
   * DELETE /posts/:id
   * Owner-only soft delete. Former members may delete their own posts.
   */
  @Delete('posts/:id')
  async deleteByOwner(@Param('id') id: string, @CurrentUser() user: Principal) {
    const data = await this.postService.deleteByOwner(id, user.userId);
    return { success: true, data };
  }
}
