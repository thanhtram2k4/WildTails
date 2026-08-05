import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type { SavedPostEntry, PostResponse, PostAuthorEmbed } from '@wildtails/contracts';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@wildtails/database';

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

@Injectable()
export class SavedPostService {
  constructor(private readonly prisma: PrismaService) {}

  async save(postId: string, userId: string): Promise<SavedPostEntry> {
    // Verify post exists, not deleted/moderated, user has active membership
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

    try {
      const saved = await this.prisma.db.savedPost.create({
        data: { userId, postId },
        select: { id: true, postId: true, createdAt: true },
      });

      return {
        postId: saved.postId,
        savedAt: saved.createdAt.toISOString(),
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Post already saved');
      }
      throw err;
    }
  }

  async unsave(postId: string, userId: string): Promise<{ unsaved: boolean }> {
    const saved = await this.prisma.db.savedPost.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { id: true },
    });

    if (!saved) {
      throw new NotFoundException('Saved post not found');
    }

    await this.prisma.db.savedPost.delete({
      where: { userId_postId: { userId, postId } },
    });

    return { unsaved: true };
  }

  async list(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ data: SavedPostEntry[]; meta: { cursor: string | null; hasMore: boolean } }> {
    type SavedWhere = NonNullable<Parameters<typeof this.prisma.db.savedPost.findMany>[0]>['where'];

    const where: SavedWhere = {
      userId,
      post: { deletedAt: null, moderatedAt: null },
    };

    if (cursor) {
      const { c, i } = decodeCursor(cursor);
      const ts = new Date(c);
      if (isNaN(ts.getTime())) throw new BadRequestException('Invalid cursor');
      where.OR = [{ createdAt: { lt: ts } }, { createdAt: ts, id: { lt: i } }];
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const savedPosts = await this.prisma.db.savedPost.findMany({
      where,
      select: {
        id: true,
        postId: true,
        createdAt: true,
        post: {
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
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: safeLimit + 1,
    });

    const hasMore = savedPosts.length > safeLimit;
    const items = hasMore ? savedPosts.slice(0, safeLimit) : savedPosts;

    // Batch compute reaction and comment counts
    const postIds = items.map((s) => s.postId);
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

    const reactionMap = new Map<string, Record<string, number>>();
    for (const row of reactionRows) {
      if (!reactionMap.has(row.postId)) reactionMap.set(row.postId, {});
      reactionMap.get(row.postId)![row.type] = row._count.id;
    }
    const commentMap = new Map<string, number>();
    for (const row of commentRows) {
      commentMap.set(row.postId, row._count.id);
    }

    const data: SavedPostEntry[] = items.map((s) => {
      const p = s.post;
      const postResponse: PostResponse = {
        id: p.id,
        body: p.body,
        authorId: p.authorId,
        author: {
          id: p.author.id,
          displayName: p.author.displayName,
          avatarUrl: p.author.avatarUrl ?? null,
        } satisfies PostAuthorEmbed,
        planetId: p.planetId,
        type: p.type as PostResponse['type'],
        goalId: p.goalId ?? undefined,
        reactionCounts: (reactionMap.get(p.id) ?? {}) as PostResponse['reactionCounts'],
        commentCount: commentMap.get(p.id) ?? 0,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };

      return {
        postId: s.postId,
        savedAt: s.createdAt.toISOString(),
        post: postResponse,
      };
    });

    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

    return { data, meta: { cursor: nextCursor, hasMore } };
  }
}
