import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { CreateReportRequest, ReportResponse } from '@wildtails/contracts';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@wildtails/database';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReportRequest): Promise<ReportResponse> {
    let planetId: string | null = null;

    if (dto.targetType === 'POST') {
      const post = await this.prisma.db.post.findFirst({
        where: { id: dto.targetId, deletedAt: null },
        select: { id: true, authorId: true, planetId: true },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Reject self-report (D32)
      if (post.authorId === userId) {
        throw new BadRequestException('Cannot report your own content');
      }

      // Derive planetId server-side
      planetId = post.planetId;
    } else if (dto.targetType === 'COMMENT') {
      const comment = await this.prisma.db.comment.findFirst({
        where: { id: dto.targetId, deletedAt: null },
        select: {
          id: true,
          authorId: true,
          post: { select: { planetId: true } },
        },
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      // Reject self-report (D32)
      if (comment.authorId === userId) {
        throw new BadRequestException('Cannot report your own content');
      }

      // Derive planetId from comment → post
      planetId = comment.post.planetId;
    } else if (dto.targetType === 'USER') {
      // Reject self-report before any DB lookup (D32)
      if (dto.targetId === userId) {
        throw new BadRequestException('Cannot report yourself');
      }

      const target = await this.prisma.db.user.findFirst({
        where: { id: dto.targetId, isActive: true, deletedAt: null },
        select: { id: true },
      });

      if (!target) {
        throw new NotFoundException('User not found');
      }

      // USER reports have no planetId
      planetId = null;
    }

    try {
      const report = await this.prisma.db.report.create({
        data: {
          reporterId: userId,
          targetType: dto.targetType,
          targetId: dto.targetId,
          reason: dto.reason,
          description: dto.description,
          planetId,
          status: 'PENDING',
        },
        select: {
          id: true,
          targetType: true,
          targetId: true,
          reason: true,
          status: true,
          createdAt: true,
        },
      });

      return {
        id: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A pending report for this target already exists');
      }
      throw err;
    }
  }
}
