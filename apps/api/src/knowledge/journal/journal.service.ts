import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type {
  CreateJournalRequest,
  UpdateJournalRequest,
  JournalResponse,
} from '@wildtails/contracts';
import { JOURNAL_MAX_TAGS } from '@wildtails/contracts';
import { PrismaService } from '../../database/prisma.service';
import { JournalPermissionService } from './journal-permission.service';

@Injectable()
export class JournalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: JournalPermissionService,
  ) {}

  async create(userId: string, dto: CreateJournalRequest): Promise<JournalResponse> {
    if (dto.tagIds && dto.tagIds.length > JOURNAL_MAX_TAGS) {
      throw new BadRequestException(`Maximum ${JOURNAL_MAX_TAGS} tags per journal`);
    }

    // Validate tags belong to user
    if (dto.tagIds && dto.tagIds.length > 0) {
      const tagCount = await this.prisma.db.tag.count({
        where: { id: { in: dto.tagIds }, ownerId: userId },
      });
      if (tagCount !== dto.tagIds.length) {
        throw new BadRequestException('One or more tags not found');
      }
    }

    // Validate folder belongs to user
    if (dto.folderId) {
      const folder = await this.prisma.db.folder.findFirst({
        where: { id: dto.folderId, ownerId: userId },
        select: { id: true },
      });
      if (!folder) throw new NotFoundException('Folder not found');
    }

    // Validate goal belongs to user
    if (dto.goalId) {
      const goal = await this.prisma.db.goal.findFirst({
        where: { id: dto.goalId, ownerId: userId },
        select: { id: true },
      });
      if (!goal) throw new NotFoundException('Goal not found');
    }

    const journal = await this.prisma.db.$transaction(async (tx) => {
      const created = await tx.journal.create({
        data: {
          title: dto.title,
          body: dto.body,
          ownerId: userId,
          planetId: dto.planetId,
          folderId: dto.folderId,
          visibility: dto.visibility ?? 'PRIVATE',
          goalId: dto.goalId,
        },
      });

      if (dto.tagIds && dto.tagIds.length > 0) {
        await tx.journalTag.createMany({
          data: dto.tagIds.map((tagId) => ({
            journalId: created.id,
            tagId,
          })),
        });
      }

      return created;
    });

    return this.findByIdAsOwner(journal.id, userId);
  }

  async list(
    userId: string,
    options: {
      cursor?: string;
      limit: number;
      folderId?: string;
      tagId?: string;
      goalId?: string;
    },
  ): Promise<{ data: JournalResponse[]; meta: { cursor: string | null; hasMore: boolean } }> {
    const { cursor, limit, folderId, tagId, goalId } = options;

    // Parse cursor: "updatedAt|id"
    // Build where clause with type-safe approach
    const baseWhere: Parameters<typeof this.prisma.db.journal.findMany>[0] & object = {};
    const whereObj = baseWhere as { where?: object };
    void whereObj;

    type JournalWhere = NonNullable<Parameters<typeof this.prisma.db.journal.findMany>[0]>['where'];

    const where: JournalWhere = {
      ownerId: userId,
      deletedAt: null,
    };

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

    if (folderId) where.folderId = folderId;
    if (goalId) where.goalId = goalId;
    if (tagId) {
      where.tags = { some: { tagId } };
    }

    const journals = await this.prisma.db.journal.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        folder: { select: { id: true, name: true } },
        goal: { select: { id: true, title: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = journals.length > limit;
    const items = hasMore ? journals.slice(0, limit) : journals;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? `${last.updatedAt.toISOString()}|${last.id}` : null;

    return {
      data: items.map((j) => this.toResponse(j, true)),
      meta: { cursor: nextCursor, hasMore },
    };
  }

  async findById(journalId: string, userId: string): Promise<JournalResponse> {
    const check = await this.permissions.checkReadPermission(journalId, userId);
    if (!check || !check.permission.allowed) {
      throw new NotFoundException('Journal not found');
    }

    if (check.permission.isOwner) {
      return this.findByIdAsOwner(journalId, userId);
    }

    // Non-owner read: return body but not versions/sharePermissions
    const journal = await this.prisma.db.journal.findFirst({
      where: { id: journalId, deletedAt: null },
      include: {
        tags: { include: { tag: true } },
        folder: { select: { id: true, name: true } },
        goal: { select: { id: true, title: true } },
      },
    });

    if (!journal) throw new NotFoundException('Journal not found');
    return this.toResponse(journal, false);
  }

  async update(
    journalId: string,
    userId: string,
    dto: UpdateJournalRequest,
  ): Promise<JournalResponse> {
    const existing = await this.prisma.db.journal.findFirst({
      where: { id: journalId, ownerId: userId, deletedAt: null },
      select: { id: true, body: true, title: true, visibility: true },
    });
    if (!existing) throw new NotFoundException('Journal not found');

    if (dto.tagIds !== undefined) {
      if (dto.tagIds.length > JOURNAL_MAX_TAGS) {
        throw new BadRequestException(`Maximum ${JOURNAL_MAX_TAGS} tags per journal`);
      }
      if (dto.tagIds.length > 0) {
        const tagCount = await this.prisma.db.tag.count({
          where: { id: { in: dto.tagIds }, ownerId: userId },
        });
        if (tagCount !== dto.tagIds.length) {
          throw new BadRequestException('One or more tags not found');
        }
      }
    }

    if (dto.folderId) {
      const folder = await this.prisma.db.folder.findFirst({
        where: { id: dto.folderId, ownerId: userId },
        select: { id: true },
      });
      if (!folder) throw new NotFoundException('Folder not found');
    }

    if (dto.goalId) {
      const goal = await this.prisma.db.goal.findFirst({
        where: { id: dto.goalId, ownerId: userId },
        select: { id: true },
      });
      if (!goal) throw new NotFoundException('Goal not found');
    }

    // Visibility transition: if changing away from SELECTED_USERS, revoke all active shares
    const changingAwayFromSelectedUsers =
      dto.visibility !== undefined &&
      dto.visibility !== 'SELECTED_USERS' &&
      existing.visibility === 'SELECTED_USERS';

    const bodyChanged = dto.body !== undefined && dto.body !== existing.body;

    await this.prisma.db.$transaction(async (tx) => {
      // Create version snapshot if body changed
      if (bodyChanged) {
        await tx.journalVersion.create({
          data: {
            journalId,
            title: existing.title,
            body: existing.body,
            editedById: userId,
          },
        });
      }

      // Revoke active shares on visibility transition away from SELECTED_USERS
      if (changingAwayFromSelectedUsers) {
        const now = new Date();
        await tx.sharePermission.updateMany({
          where: { journalId, revokedAt: null },
          data: { revokedAt: now },
        });
        await tx.auditLog.create({
          data: {
            userId,
            action: 'SHARE_REVOKE_ALL',
            targetType: 'Journal',
            targetId: journalId,
            metadata: { reason: 'visibility_changed', newVisibility: dto.visibility },
          },
        });
      }

      // Update journal
      await tx.journal.update({
        where: { id: journalId },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.body !== undefined && { body: dto.body }),
          ...(dto.visibility !== undefined && { visibility: dto.visibility }),
          ...(dto.planetId !== undefined && { planetId: dto.planetId }),
          ...(dto.folderId !== undefined && { folderId: dto.folderId }),
          ...(dto.goalId !== undefined && { goalId: dto.goalId }),
        },
      });

      // Update tags
      if (dto.tagIds !== undefined) {
        await tx.journalTag.deleteMany({ where: { journalId } });
        if (dto.tagIds.length > 0) {
          await tx.journalTag.createMany({
            data: dto.tagIds.map((tagId) => ({ journalId, tagId })),
          });
        }
      }
    });

    return this.findByIdAsOwner(journalId, userId);
  }

  async softDelete(journalId: string, userId: string): Promise<{ deleted: boolean }> {
    const existing = await this.prisma.db.journal.findFirst({
      where: { id: journalId, ownerId: userId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Journal not found');

    await this.prisma.db.$transaction(async (tx) => {
      await tx.journal.update({
        where: { id: journalId },
        data: { deletedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'JOURNAL_DELETE',
          targetType: 'Journal',
          targetId: journalId,
        },
      });
    });

    return { deleted: true };
  }

  async listVersions(
    journalId: string,
    userId: string,
  ): Promise<{ id: string; body: string | undefined; createdAt: string }[]> {
    const journal = await this.prisma.db.journal.findFirst({
      where: { id: journalId, ownerId: userId, deletedAt: null },
      select: { id: true },
    });
    if (!journal) throw new NotFoundException('Journal not found');

    const versions = await this.prisma.db.journalVersion.findMany({
      where: { journalId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, body: true, createdAt: true },
    });

    return versions.map((v) => ({
      id: v.id,
      body: v.body ?? undefined,
      createdAt: v.createdAt.toISOString(),
    }));
  }

  private async findByIdAsOwner(journalId: string, userId: string): Promise<JournalResponse> {
    const journal = await this.prisma.db.journal.findFirst({
      where: { id: journalId, ownerId: userId, deletedAt: null },
      include: {
        tags: { include: { tag: true } },
        folder: { select: { id: true, name: true } },
        goal: { select: { id: true, title: true } },
      },
    });

    if (!journal) throw new NotFoundException('Journal not found');
    return this.toResponse(journal, true);
  }

  private toResponse(
    journal: {
      id: string;
      title: string;
      body: string | null;
      ownerId: string;
      planetId: string | null;
      visibility: string;
      tags: { tag: { id: string; name: string } }[];
      folder: { id: string; name: string } | null;
      goal: { id: string; title: string } | null;
      createdAt: Date;
      updatedAt: Date;
    },
    _isOwner: boolean,
  ): JournalResponse {
    return {
      id: journal.id,
      title: journal.title,
      body: journal.body ?? undefined,
      ownerId: journal.ownerId,
      planetId: journal.planetId ?? undefined,
      visibility: journal.visibility as JournalResponse['visibility'],
      tags: journal.tags.map((jt) => ({ id: jt.tag.id, name: jt.tag.name })),
      folder: journal.folder ?? undefined,
      goal: journal.goal ?? undefined,
      createdAt: journal.createdAt.toISOString(),
      updatedAt: journal.updatedAt.toISOString(),
    };
  }
}
