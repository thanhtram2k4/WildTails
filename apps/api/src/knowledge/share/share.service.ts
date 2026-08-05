import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { SharePermissionResponse } from '@wildtails/contracts';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ShareService {
  constructor(private readonly prisma: PrismaService) {}

  async grant(
    journalId: string,
    grantedByUserId: string,
    grantedToUserId: string,
    expiresAt?: string,
  ): Promise<SharePermissionResponse> {
    // Self-share check
    if (grantedByUserId === grantedToUserId) {
      throw new BadRequestException('Cannot share a journal with yourself');
    }

    // Verify journal ownership and visibility
    const journal = await this.prisma.db.journal.findFirst({
      where: { id: journalId, ownerId: grantedByUserId, deletedAt: null },
      select: { id: true, visibility: true },
    });
    if (!journal) throw new NotFoundException('Journal not found');

    if (journal.visibility !== 'SELECTED_USERS') {
      throw new BadRequestException('Journal visibility must be SELECTED_USERS before sharing');
    }

    // Verify recipient exists
    const recipient = await this.prisma.db.user.findFirst({
      where: { id: grantedToUserId, deletedAt: null },
      select: { id: true },
    });
    if (!recipient) throw new NotFoundException('Recipient not found');

    // Attempt to create — partial unique index enforces one active share per user+journal
    try {
      const share = await this.prisma.db.$transaction(async (tx) => {
        const created = await tx.sharePermission.create({
          data: {
            journalId,
            grantedToUserId,
            grantedByUserId,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: grantedByUserId,
            action: 'SHARE_GRANT',
            targetType: 'SharePermission',
            targetId: created.id,
            metadata: {
              journalId,
              grantedToUserId,
              expiresAt: expiresAt ?? null,
            },
          },
        });

        return created;
      });

      return this.toResponse(share);
    } catch (err: unknown) {
      // Prisma unique constraint error code
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('An active share permission already exists for this user');
      }
      throw err;
    }
  }

  async listActive(journalId: string, ownerId: string): Promise<SharePermissionResponse[]> {
    const journal = await this.prisma.db.journal.findFirst({
      where: { id: journalId, ownerId, deletedAt: null },
      select: { id: true },
    });
    if (!journal) throw new NotFoundException('Journal not found');

    const shares = await this.prisma.db.sharePermission.findMany({
      where: { journalId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return shares.map((s) => this.toResponse(s));
  }

  async revoke(
    journalId: string,
    permissionId: string,
    ownerId: string,
  ): Promise<{ revoked: boolean }> {
    const journal = await this.prisma.db.journal.findFirst({
      where: { id: journalId, ownerId, deletedAt: null },
      select: { id: true },
    });
    if (!journal) throw new NotFoundException('Journal not found');

    const permission = await this.prisma.db.sharePermission.findFirst({
      where: { id: permissionId, journalId, revokedAt: null },
      select: { id: true },
    });
    if (!permission) throw new NotFoundException('Permission not found');

    const now = new Date();
    await this.prisma.db.$transaction(async (tx) => {
      await tx.sharePermission.update({
        where: { id: permissionId },
        data: { revokedAt: now },
      });
      await tx.auditLog.create({
        data: {
          userId: ownerId,
          action: 'SHARE_REVOKE',
          targetType: 'SharePermission',
          targetId: permissionId,
          metadata: { journalId },
        },
      });
    });

    return { revoked: true };
  }

  private toResponse(share: {
    id: string;
    journalId: string;
    grantedToUserId: string;
    grantedByUserId: string;
    expiresAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
  }): SharePermissionResponse {
    return {
      id: share.id,
      journalId: share.journalId,
      userId: share.grantedToUserId,
      grantedBy: share.grantedByUserId,
      expiresAt: share.expiresAt?.toISOString() ?? null,
      revokedAt: share.revokedAt?.toISOString() ?? null,
      createdAt: share.createdAt.toISOString(),
    };
  }
}
