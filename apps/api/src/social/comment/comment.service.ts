import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { CreateCommentRequest, CommentResponse } from '@wildtails/contracts';
import { PrismaService } from '../../database/prisma.service';

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ c: createdAt.toISOString(), i: id })).toString('base64url');
}

function decodeCursor(cursor: string): { c: string; i: string } {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>)['c'] === 'string' &&
      typeof (parsed as Record<string, unknown>)['i'] === 'string'
    ) {
      return parsed as { c: string; i: string };
    }
  } catch {
    // fall through
  }
  throw new BadRequestException('Invalid cursor');
}

function toCommentResponse(comment: {
  id: string;
  body: string;
  authorId: string;
  author: { id: string; displayName: string; avatarUrl: string | null };
  postId: string;
  parentId: string | null;
  createdAt: Date;
}): CommentResponse {
  return {
    id: comment.id,
    body: comment.body,
    authorId: comment.authorId,
    author: {
      id: comment.author.id,
      displayName: comment.author.displayName,
      avatarUrl: comment.author.avatarUrl ?? null,
    },
    postId: comment.postId,
    parentId: comment.parentId ?? undefined,
    createdAt: comment.createdAt.toISOString(),
  };
}

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    postId: string,
    userId: string,
    dto: CreateCommentRequest,
  ): Promise<CommentResponse> {
    // Find post: must exist, not deleted, not moderated
    const post = await this.prisma.db.post.findFirst({
      where: { id: postId, deletedAt: null, moderatedAt: null },
      select: { id: true, planetId: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Validate active planet membership
    const membership = await this.prisma.db.planetMembership.findUnique({
      where: { planetId_userId: { planetId: post.planetId, userId } },
      select: { leftAt: true },
    });

    if (!membership || membership.leftAt !== null) {
      throw new ForbiddenException('Active planet membership required to comment');
    }

    // Validate parentId if provided (D23: depth=1 only)
    if (dto.parentId) {
      const parent = await this.prisma.db.comment.findFirst({
        where: { id: dto.parentId, deletedAt: null, moderatedAt: null },
        select: { id: true, postId: true, parentId: true },
      });

      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }

      // Parent must belong to the same post
      if (parent.postId !== postId) {
        throw new BadRequestException('Parent comment belongs to a different post');
      }

      // Parent must not itself be a reply (depth=1 only, D23)
      if (parent.parentId !== null) {
        throw new BadRequestException('Replies to replies are not allowed (max depth: 1)');
      }
    }

    const comment = await this.prisma.db.comment.create({
      data: {
        body: dto.body,
        authorId: userId,
        postId,
        parentId: dto.parentId ?? null,
      },
      select: {
        id: true,
        body: true,
        authorId: true,
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        postId: true,
        parentId: true,
        createdAt: true,
      },
    });

    return toCommentResponse(comment);
  }

  async list(
    postId: string,
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ data: CommentResponse[]; meta: { cursor: string | null; hasMore: boolean } }> {
    // Verify post exists and user has active membership
    const post = await this.prisma.db.post.findFirst({
      where: { id: postId, deletedAt: null, moderatedAt: null },
      select: { id: true, planetId: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const membership = await this.prisma.db.planetMembership.findUnique({
      where: { planetId_userId: { planetId: post.planetId, userId } },
      select: { leftAt: true },
    });

    if (!membership || membership.leftAt !== null) {
      throw new ForbiddenException('Active planet membership required');
    }

    type CommentWhere = NonNullable<Parameters<typeof this.prisma.db.comment.findMany>[0]>['where'];
    const where: CommentWhere = {
      postId,
      deletedAt: null,
      moderatedAt: null,
    };

    if (cursor) {
      const { c, i } = decodeCursor(cursor);
      const ts = new Date(c);
      if (isNaN(ts.getTime())) throw new BadRequestException('Invalid cursor');
      where.OR = [{ createdAt: { lt: ts } }, { createdAt: ts, id: { lt: i } }];
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const comments = await this.prisma.db.comment.findMany({
      where,
      select: {
        id: true,
        body: true,
        authorId: true,
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        postId: true,
        parentId: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: safeLimit + 1,
    });

    const hasMore = comments.length > safeLimit;
    const items = hasMore ? comments.slice(0, safeLimit) : comments;

    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

    return {
      data: items.map(toCommentResponse),
      meta: { cursor: nextCursor, hasMore },
    };
  }

  async deleteByOwner(commentId: string, userId: string): Promise<{ deleted: boolean }> {
    // Former members CAN delete their own comments — no membership check
    const comment = await this.prisma.db.comment.findFirst({
      where: { id: commentId, authorId: userId, deletedAt: null },
      select: { id: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    await this.prisma.db.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }
}
