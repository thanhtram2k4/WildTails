import { Module } from '@nestjs/common';
import { PostController } from './post/post.controller';
import { PostService } from './post/post.service';
import { CommentController } from './comment/comment.controller';
import { CommentService } from './comment/comment.service';
import { ReactionController } from './reaction/reaction.controller';
import { ReactionService } from './reaction/reaction.service';
import { SavedPostController } from './saved-post/saved-post.controller';
import { SavedPostService } from './saved-post/saved-post.service';
import { ReportController } from './report/report.controller';
import { ReportService } from './report/report.service';
import { ModerationController } from './moderation/moderation.controller';
import { ModerationService } from './moderation/moderation.service';

/**
 * Social domain module: posts, comments, reactions, saved posts, reports, moderation.
 * No exports — no cross-module dependencies in Phase 05.
 */
@Module({
  controllers: [
    PostController,
    CommentController,
    ReactionController,
    SavedPostController,
    ReportController,
    ModerationController,
  ],
  providers: [
    PostService,
    CommentService,
    ReactionService,
    SavedPostService,
    ReportService,
    ModerationService,
  ],
})
export class SocialModule {}
