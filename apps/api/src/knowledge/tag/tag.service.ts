import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import type { TagResponse } from '@wildtails/contracts';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TagService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalize a tag name:
   * - Unicode NFKC normalization
   * - Trim leading/trailing whitespace
   * - Collapse repeated internal whitespace
   * - Lowercase
   */
  private normalize(name: string): string {
    return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  async create(userId: string, name: string): Promise<TagResponse> {
    const normalized = this.normalize(name);

    try {
      const tag = await this.prisma.db.tag.create({
        data: { name: normalized, ownerId: userId },
      });
      return { id: tag.id, name: tag.name, ownerId: tag.ownerId };
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('Tag with this name already exists');
      }
      throw err;
    }
  }

  async list(userId: string): Promise<TagResponse[]> {
    const tags = await this.prisma.db.tag.findMany({
      where: { ownerId: userId },
      orderBy: { name: 'asc' },
    });
    return tags.map((t) => ({ id: t.id, name: t.name, ownerId: t.ownerId }));
  }

  async remove(tagId: string, userId: string): Promise<{ deleted: boolean }> {
    const tag = await this.prisma.db.tag.findFirst({
      where: { id: tagId, ownerId: userId },
      select: { id: true },
    });
    if (!tag) throw new NotFoundException('Tag not found');

    // Cascade: JournalTag rows are deleted by Prisma's onDelete: Cascade on the Tag relation
    await this.prisma.db.tag.delete({ where: { id: tagId } });

    return { deleted: true };
  }
}
