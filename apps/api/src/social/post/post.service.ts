import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { CreatePostRequest, PostResponse, PostAuthorEmbed } from '@wildtails/contracts';
import { PrismaService } from '../../database/prisma.service';

/**
 * Cursor payload: base64(JSON.stringify({c: createdAt ISO, i: id}))
 */
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

/**
 * Builds a safe PostResponse. journalId is intentionally excluded (D24).
 * Author embed contains id, displayName, avatarUrl ONLY (D27).
 */
function toPostResponse(
  post: {
    id: string;
    body: string;
    authorId: string;
    planetId: string;
    type: string;
    goalId: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  },
  reactionCounts: Record<string, number>,
  commentCount: number,
): PostResponse {
  return {
    id: post.id,
    body: post.body,
    authorId: post.authorId,
    author: {
      id: author.id,
      displayName: author.displayName,
      avatarUrl: author.avatarUrl ?? null,
    } satisfies PostAuthorEmbed,
    planetId: post.planetId,
    type: post.type as PostResponse['type'],
    goalId: post.goalId ?? undefined,
    // journalId is intentionally omitted (D24)
    reactionCounts: reactionCounts as PostResponse['reactionCounts'],
    commentCount,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePostRequest): Promise<PostResponse> {
    // Validate active planet membership (leftAt IS NULL)
    const membership = await this.prisma.db.planetMembership.findUnique({
      where: { planetId_userId: { planetId: dto.planetId, userId } },
      select: { role: true, leftAt: true },
    });

    if (!membership || membership.leftAt !== null) {
      throw new ForbiddenException('Active planet membership required to post');
    }

    // Type-specific validation
    if (dto.type === 'JOURNAL_SHARE') {
      if (!dto.journalId) {
        throw new BadRequestException('journalId is required for JOURNAL_SHARE posts');
      }
      const journal = await this.prisma.db.journal.findFirst({
        where: { id: dto.journalId, ownerId: userId, deletedAt: null },
        select: { id: true },
      });
      if (!journal) {
        throw new NotFoundException('Journal not found');
      }
    }

    if (dto.type === 'GOAL_UPDATE') {
      if (!dto.goalId) {
        throw new BadRequestException('goalId is required for GOAL_UPDATE posts');
      }
      const goal = await this.prisma.db.goal.findFirst({
        where: { id: dto.goalId, ownerId: userId },
        select: { id: true },
      });
      if (!goal) {
        throw new NotFoundException('Goal not found');
      }
    }

    const post = await this.prisma.db.post.create({
      data: {
        body: dto.body,
        authorId: userId,
        planetId: dto.planetId,
        type: dto.type,
        journalId: dto.type === 'JOURNAL_SHARE' ? dto.journalId : null,
        goalId: dto.type === 'GOAL_UPDATE' ? dto.goalId : null,
      },
      select: {
        id: true,
        body: true,
        authorId: true,
        planetId: true,
        type: true,
        goalId: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });

    return toPostResponse(post, post.author, {}, 0);
  }

  async listFeed(
    planetId: string,
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ data: PostResponse[]; meta: { cursor: string | null; hasMore: boolean } }> {
    // Require active planet membership (feed view = normal social action)
    const membership = await this.prisma.db.planetMembership.findUnique({
      where: { planetId_userId: { planetId, userId } },
      select: { leftAt: true },
    });

    if (!membership || membership.leftAt !== null) {
      throw new ForbiddenException('Active planet membership required to view feed');
    }

    // Verify planet exists (privacy-safe 404)
    const planet = await this.prisma.db.planet.findUnique({
      where: { id: planetId },
      select: { id: true },
    });
    if (!planet) {
      throw new NotFoundException('Planet not found');
    }

    type PostWhere = NonNullable<Parameters<typeof this.prisma.db.post.findMany>[0]>['where'];
    const where: PostWhere = {
      planetId,
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
    const posts = await this.prisma.db.post.findMany({
      where,
      select: {
        id: true,
        body: true,
        authorId: true,
        planetId: true,
        type: true,
        goalId: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: safeLimit + 1,
    });

    const hasMore = posts.length > safeLimit;
    const items = hasMore ? posts.slice(0, safeLimit) : posts;

    // Compute reaction counts and comment counts in batch
    const postIds = items.map((p) => p.id);
    const [reactionRows, commentRows] = await Promise.all([
      postIds.length > 0
        ? this.prisma.db.reaction.groupBy({
            by: ['postId', 'type'],
            where: { postId: { in: postIds } },
            _count: { id: true },
          })
        : Promise.resolve([]),
      postIds.length > 0
        ? this.prisma.db.comment.groupBy({
            by: ['postId'],
            where: { postId: { in: postIds }, deletedAt: null, moderatedAt: null },
            _count: { id: true },
          })
        : Promise.resolve([]),
    ]);

    // Build maps
    const reactionMap = new Map<string, Record<string, number>>();
    for (const row of reactionRows) {
      if (!reactionMap.has(row.postId)) reactionMap.set(row.postId, {});
      reactionMap.get(row.postId)![row.type] = row._count.id;
    }
    const commentMap = new Map<string, number>();
    for (const row of commentRows) {
      commentMap.set(row.postId, row._count.id);
    }

    const data = items.map((p) =>
      toPostResponse(p, p.author, reactionMap.get(p.id) ?? {}, commentMap.get(p.id) ?? 0),
    );

    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

    return { data, meta: { cursor: nextCursor, hasMore } };
  }

  async findById(postId: string, userId: string): Promise<PostResponse> {
    const post = await this.prisma.db.post.findFirst({
      where: { id: postId, deletedAt: null, moderatedAt: null },
      select: {
        id: true,
        body: true,
        authorId: true,
        planetId: true,
        type: true,
        goalId: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Verify active membership for the post's planet (privacy-safe 404 on failure)
    const membership = await this.prisma.db.planetMembership.findUnique({
      where: { planetId_userId: { planetId: post.planetId, userId } },
      select: { leftAt: true },
    });
    if (!membership || membership.leftAt !== null) {
      throw new NotFoundException('Post not found');
    }

    const [reactionRows, commentCount] = await Promise.all([
      this.prisma.db.reaction.groupBy({
        by: ['type'],
        where: { postId },
        _count: { id: true },
      }),
      this.prisma.db.comment.count({
        where: { postId, deletedAt: null, moderatedAt: null },
      }),
    ]);

    const reactionCounts: Record<string, number> = {};
    for (const row of reactionRows) {
      reactionCounts[row.type] = row._count.id;
    }

    return toPostResponse(post, post.author, reactionCounts, commentCount);
  }

  async deleteByOwner(postId: string, userId: string): Promise<{ deleted: boolean }> {
    // Former members CAN delete their own posts — no membership check
    const post = await this.prisma.db.post.findFirst({
      where: { id: postId, authorId: userId, deletedAt: null },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.prisma.db.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }
}
