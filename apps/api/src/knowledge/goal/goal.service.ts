import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateGoalRequest, UpdateGoalRequest, GoalResponse } from '@wildtails/contracts';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class GoalService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateGoalRequest): Promise<GoalResponse> {
    const goal = await this.prisma.db.goal.create({
      data: {
        title: dto.title,
        description: dto.description,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        ownerId: userId,
        planetId: dto.planetId,
      },
      include: { _count: { select: { journals: true } } },
    });

    return this.toResponse(goal);
  }

  async list(
    userId: string,
    options: { cursor?: string; limit: number },
  ): Promise<{ data: GoalResponse[]; meta: { cursor: string | null; hasMore: boolean } }> {
    const { cursor, limit } = options;

    type GoalWhere = NonNullable<Parameters<typeof this.prisma.db.goal.findMany>[0]>['where'];
    const where: GoalWhere = { ownerId: userId };

    if (cursor) {
      const pipeIdx = cursor.indexOf('|');
      const tsStr = cursor.substring(0, pipeIdx);
      const cursorId = cursor.substring(pipeIdx + 1);
      const ts = new Date(tsStr);
      if (isNaN(ts.getTime()) || !cursorId) {
        throw new BadRequestException('Invalid cursor');
      }
      where.OR = [{ updatedAt: { lt: ts } }, { updatedAt: ts, id: { lt: cursorId } }];
    }

    const goals = await this.prisma.db.goal.findMany({
      where,
      include: { _count: { select: { journals: true } } },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = goals.length > limit;
    const items = hasMore ? goals.slice(0, limit) : goals;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? `${last.updatedAt.toISOString()}|${last.id}` : null;

    return {
      data: items.map((g) => this.toResponse(g)),
      meta: { cursor: nextCursor, hasMore },
    };
  }

  async findById(goalId: string, userId: string): Promise<GoalResponse> {
    const goal = await this.prisma.db.goal.findFirst({
      where: { id: goalId, ownerId: userId },
      include: { _count: { select: { journals: true } } },
    });
    if (!goal) throw new NotFoundException('Goal not found');
    return this.toResponse(goal);
  }

  async update(goalId: string, userId: string, dto: UpdateGoalRequest): Promise<GoalResponse> {
    const existing = await this.prisma.db.goal.findFirst({
      where: { id: goalId, ownerId: userId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Goal not found');

    const updated = await this.prisma.db.goal.update({
      where: { id: goalId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.progress !== undefined && { progress: dto.progress }),
        ...(dto.deadline !== undefined && {
          deadline: dto.deadline ? new Date(dto.deadline) : null,
        }),
      },
      include: { _count: { select: { journals: true } } },
    });

    return this.toResponse(updated);
  }

  async remove(goalId: string, userId: string): Promise<{ deleted: boolean }> {
    const existing = await this.prisma.db.goal.findFirst({
      where: { id: goalId, ownerId: userId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Goal not found');

    await this.prisma.db.$transaction(async (tx) => {
      // Unlink journals owned by this user
      await tx.journal.updateMany({
        where: { goalId, ownerId: userId },
        data: { goalId: null },
      });
      await tx.goal.delete({ where: { id: goalId } });
    });

    return { deleted: true };
  }

  private toResponse(goal: {
    id: string;
    title: string;
    description: string | null;
    ownerId: string;
    progress: number;
    deadline: Date | null;
    planetId: string | null;
    createdAt: Date;
    updatedAt: Date;
    _count: { journals: number };
  }): GoalResponse {
    return {
      id: goal.id,
      title: goal.title,
      description: goal.description ?? undefined,
      ownerId: goal.ownerId,
      progress: goal.progress,
      deadline: goal.deadline?.toISOString() ?? null,
      planetId: goal.planetId ?? undefined,
      linkedJournalCount: goal._count.journals,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }
}
