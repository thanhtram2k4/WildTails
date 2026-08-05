import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import type { ReactionResponse, ReactionType } from '@wildtails/contracts';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@wildtails/database';

@Injectable()
export class ReactionService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyPostAccess(postId: string, userId: string): Promise<{ planetId: string }> {
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

    return { planetId: post.planetId };
  }

  private async buildResponse(postId: string, userId: string): Promise<ReactionResponse> {
    const [reactionRows, userReaction] = await Promise.all([
      this.prisma.db.reaction.groupBy({
        by: ['type'],
        where: { postId },
        _count: { id: true },
      }),
      this.prisma.db.reaction.findUnique({
        where: { userId_postId: { userId, postId } },
        select: { type: true },
      }),
    ]);

    const counts: Record<string, number> = {};
    for (const row of reactionRows) {
      counts[row.type] = row._count.id;
    }

    return {
      postId,
      counts: counts as ReactionResponse['counts'],
      userReaction: (userReaction?.type as ReactionType) ?? undefined,
    };
  }

  async toggle(postId: string, userId: string, type: ReactionType): Promise<ReactionResponse> {
    await this.verifyPostAccess(postId, userId);

    await this.prisma.db.$transaction(async (tx) => {
      const existing = await tx.reaction.findUnique({
        where: { userId_postId: { userId, postId } },
        select: { id: true, type: true },
      });

      if (!existing) {
        // No existing reaction → create
        try {
          await tx.reaction.create({
            data: { userId, postId, type },
          });
        } catch (err) {
          // Handle unique constraint race (P2002) gracefully
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            // Another concurrent request created it; ignore
          } else {
            throw err;
          }
        }
      } else if (existing.type === type) {
        // Same type → remove (toggle off)
        await tx.reaction.delete({ where: { userId_postId: { userId, postId } } });
      } else {
        // Different type → update to new type
        await tx.reaction.update({
          where: { userId_postId: { userId, postId } },
          data: { type },
        });
      }
    });

    return this.buildResponse(postId, userId);
  }

  async getCounts(postId: string, userId: string): Promise<ReactionResponse> {
    // Verify post access before returning data
    await this.verifyPostAccess(postId, userId);
    return this.buildResponse(postId, userId);
  }
}
