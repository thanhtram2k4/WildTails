import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type {
  CreateFolderRequest,
  UpdateFolderRequest,
  FolderResponse,
} from '@wildtails/contracts';
import { PrismaService } from '../../database/prisma.service';

const MAX_FOLDER_DEPTH = 3;

@Injectable()
export class FolderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFolderRequest): Promise<FolderResponse> {
    if (dto.parentId) {
      await this.validateParent(dto.parentId, userId, null);
    }

    const folder = await this.prisma.db.folder.create({
      data: {
        name: dto.name,
        ownerId: userId,
        parentId: dto.parentId,
        planetId: dto.planetId,
      },
      include: { _count: { select: { journals: true } } },
    });

    return this.toResponse(folder);
  }

  async list(
    userId: string,
    options: { cursor?: string; limit: number },
  ): Promise<{ data: FolderResponse[]; meta: { cursor: string | null; hasMore: boolean } }> {
    const { cursor, limit } = options;

    type FolderWhere = NonNullable<Parameters<typeof this.prisma.db.folder.findMany>[0]>['where'];
    const where: FolderWhere = { ownerId: userId };

    if (cursor) {
      const pipeIdx = cursor.indexOf('|');
      const tsStr = cursor.substring(0, pipeIdx);
      const cursorId = cursor.substring(pipeIdx + 1);
      const ts = new Date(tsStr);
      if (isNaN(ts.getTime()) || !cursorId) {
        throw new BadRequestException('Invalid cursor');
      }
      where.OR = [{ createdAt: { lt: ts } }, { createdAt: ts, id: { lt: cursorId } }];
    }

    const folders = await this.prisma.db.folder.findMany({
      where,
      include: { _count: { select: { journals: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = folders.length > limit;
    const items = hasMore ? folders.slice(0, limit) : folders;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? `${last.createdAt.toISOString()}|${last.id}` : null;

    return {
      data: items.map((f) => this.toResponse(f)),
      meta: { cursor: nextCursor, hasMore },
    };
  }

  async update(
    folderId: string,
    userId: string,
    dto: UpdateFolderRequest,
  ): Promise<FolderResponse> {
    const existing = await this.prisma.db.folder.findFirst({
      where: { id: folderId, ownerId: userId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Folder not found');

    if (dto.parentId !== undefined && dto.parentId !== null) {
      await this.validateParent(dto.parentId, userId, folderId);
    }

    const updated = await this.prisma.db.folder.update({
      where: { id: folderId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
      include: { _count: { select: { journals: true } } },
    });

    return this.toResponse(updated);
  }

  async remove(folderId: string, userId: string): Promise<{ deleted: boolean }> {
    const existing = await this.prisma.db.folder.findFirst({
      where: { id: folderId, ownerId: userId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Folder not found');

    await this.prisma.db.$transaction(async (tx) => {
      // Unparent journals
      await tx.journal.updateMany({
        where: { folderId },
        data: { folderId: null },
      });
      // Unparent child folders
      await tx.folder.updateMany({
        where: { parentId: folderId },
        data: { parentId: null },
      });
      // Delete the folder
      await tx.folder.delete({ where: { id: folderId } });
    });

    return { deleted: true };
  }

  /**
   * Validates that a parent folder:
   * 1. Exists and belongs to the user (privacy-safe 404)
   * 2. Is not the folder itself (self-parenting)
   * 3. Does not exceed max nesting depth (3)
   * 4. Does not create a cycle
   */
  private async validateParent(
    parentId: string,
    userId: string,
    currentFolderId: string | null,
  ): Promise<void> {
    if (currentFolderId && parentId === currentFolderId) {
      throw new BadRequestException('A folder cannot be its own parent');
    }

    const parent = await this.prisma.db.folder.findFirst({
      where: { id: parentId, ownerId: userId },
      select: { id: true, parentId: true },
    });
    if (!parent) throw new NotFoundException('Parent folder not found');

    // Check depth: walk up the chain
    let depth = 1;
    let current = parent;
    const visited = new Set<string>([parentId]);
    if (currentFolderId) visited.add(currentFolderId);

    while (current.parentId) {
      depth++;
      if (depth >= MAX_FOLDER_DEPTH) {
        throw new BadRequestException(`Maximum folder nesting depth is ${MAX_FOLDER_DEPTH}`);
      }
      if (visited.has(current.parentId)) {
        throw new BadRequestException('Circular folder reference detected');
      }
      visited.add(current.parentId);
      const next = await this.prisma.db.folder.findFirst({
        where: { id: current.parentId, ownerId: userId },
        select: { id: true, parentId: true },
      });
      if (!next) break;
      current = next;
    }
  }

  private toResponse(folder: {
    id: string;
    name: string;
    ownerId: string;
    parentId: string | null;
    createdAt: Date;
    _count: { journals: number };
  }): FolderResponse {
    return {
      id: folder.id,
      name: folder.name,
      ownerId: folder.ownerId,
      parentId: folder.parentId ?? undefined,
      journalCount: folder._count.journals,
      createdAt: folder.createdAt.toISOString(),
    };
  }
}
