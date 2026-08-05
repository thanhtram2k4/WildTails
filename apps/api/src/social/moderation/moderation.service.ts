import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type { ReviewReportRequest, ReportResponse } from '@wildtails/contracts';
import { PrismaService } from '../../database/prisma.service';

type PlanetRoleValue = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';

const MODERATOR_ROLES: PlanetRoleValue[] = ['OWNER', 'ADMIN', 'MODERATOR'];

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

function toReportResponse(report: {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: Date;
}): ReportResponse {
  return {
    id: report.id,
    targetType: report.targetType as ReportResponse['targetType'],
    targetId: report.targetId,
    reason: report.reason,
    status: report.status as ReportResponse['status'],
    createdAt: report.createdAt.toISOString(),
  };
}

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifies the caller has moderation rights for the given planet.
   * Platform ADMIN (userRole === 'ADMIN') passes without membership check.
   * Planet moderators require active membership with MODERATOR/ADMIN/OWNER role.
   */
  private async verifyModerationRights(
    planetId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    if (userRole === 'ADMIN') return; // Platform ADMIN can moderate any planet

    const membership = await this.prisma.db.planetMembership.findUnique({
      where: { planetId_userId: { planetId, userId } },
      select: { role: true, leftAt: true },
    });

    if (
      !membership ||
      membership.leftAt !== null ||
      !MODERATOR_ROLES.includes(membership.role as PlanetRoleValue)
    ) {
      throw new ForbiddenException('Moderation rights required for this planet');
    }
  }

  async listPlanetReports(
    planetId: string,
    userId: string,
    userRole: string,
    cursor?: string,
    limit = 20,
    statusFilter?: string,
  ): Promise<{ data: ReportResponse[]; meta: { cursor: string | null; hasMore: boolean } }> {
    await this.verifyModerationRights(planetId, userId, userRole);

    type ReportWhere = NonNullable<Parameters<typeof this.prisma.db.report.findMany>[0]>['where'];
    const where: ReportWhere = { planetId };

    if (statusFilter) {
      where.status = statusFilter as ReportResponse['status'];
    }

    if (cursor) {
      const { c, i } = decodeCursor(cursor);
      const ts = new Date(c);
      if (isNaN(ts.getTime())) throw new BadRequestException('Invalid cursor');
      where.OR = [{ createdAt: { lt: ts } }, { createdAt: ts, id: { lt: i } }];
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const reports = await this.prisma.db.report.findMany({
      where,
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        status: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: safeLimit + 1,
    });

    const hasMore = reports.length > safeLimit;
    const items = hasMore ? reports.slice(0, safeLimit) : reports;

    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

    return {
      data: items.map(toReportResponse),
      meta: { cursor: nextCursor, hasMore },
    };
  }

  async reviewReport(
    reportId: string,
    userId: string,
    userRole: string,
    dto: ReviewReportRequest,
  ): Promise<ReportResponse> {
    const report = await this.prisma.db.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        status: true,
        planetId: true,
        createdAt: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Verify moderation rights for this report's planet
    if (report.planetId === null) {
      // USER reports: only platform ADMIN
      if (userRole !== 'ADMIN') {
        throw new ForbiddenException('Only platform ADMIN can review USER reports');
      }
    } else {
      await this.verifyModerationRights(report.planetId, userId, userRole);
    }

    const now = new Date();

    // All operations are atomic: report update + content hide + AuditLog
    const updatedReport = await this.prisma.db.$transaction(async (tx) => {
      // Conditional update: only update if still PENDING
      const result = await tx.report.updateMany({
        where: { id: reportId, status: 'PENDING' },
        data: {
          status: dto.status,
          reviewedById: userId,
          reviewedAt: now,
        },
      });

      if (result.count === 0) {
        throw new ConflictException('Report has already been processed');
      }

      // If ACTIONED: hide the target content
      if (dto.status === 'ACTIONED') {
        if (report.targetType === 'POST') {
          await tx.post.updateMany({
            where: { id: report.targetId },
            data: { moderatedAt: now, moderatedById: userId },
          });
        } else if (report.targetType === 'COMMENT') {
          await tx.comment.updateMany({
            where: { id: report.targetId },
            data: { moderatedAt: now, moderatedById: userId },
          });
        }
        // USER: no content action in Phase 05 scope
      }

      // Audit log: safe metadata ONLY — never include post/comment body, email, tokens
      await tx.auditLog.create({
        data: {
          userId,
          action: `REPORT_${dto.status}`,
          targetType: 'Report',
          targetId: reportId,
          metadata: {
            reportTargetType: report.targetType,
            reportTargetId: report.targetId,
            // note is safe (moderator-written label, max 500 chars — no private content)
            ...(dto.note ? { note: dto.note } : {}),
          },
        },
      });

      // Re-fetch the updated report for the response
      return tx.report.findUniqueOrThrow({
        where: { id: reportId },
        select: {
          id: true,
          targetType: true,
          targetId: true,
          reason: true,
          status: true,
          createdAt: true,
        },
      });
    });

    return toReportResponse(updatedReport);
  }
}
