import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface PermissionResult {
  allowed: boolean;
  isOwner: boolean;
}

/**
 * Evaluates journal read permission per ADR-003 evaluation order:
 * 1. Ownership
 * 2. SELECTED_USERS with valid, non-expired, non-revoked SharePermission
 * 3. PLANET_MEMBERS with active PlanetMembership
 * 4. PUBLIC
 * 5. Default deny
 *
 * No authorization caching — every check queries the database.
 */
@Injectable()
export class JournalPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a user can read a journal.
   * Returns null if the journal does not exist or is soft-deleted.
   */
  async checkReadPermission(
    journalId: string,
    userId: string,
  ): Promise<{
    journal: { id: string; ownerId: string; visibility: string; planetId: string | null };
    permission: PermissionResult;
  } | null> {
    const journal = await this.prisma.db.journal.findFirst({
      where: { id: journalId, deletedAt: null },
      select: { id: true, ownerId: true, visibility: true, planetId: true },
    });

    if (!journal) return null;

    // 1. Ownership
    if (journal.ownerId === userId) {
      return { journal, permission: { allowed: true, isOwner: true } };
    }

    // 2. SELECTED_USERS
    if (journal.visibility === 'SELECTED_USERS') {
      const share = await this.prisma.db.sharePermission.findFirst({
        where: {
          journalId,
          grantedToUserId: userId,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { id: true },
      });
      if (share) {
        return { journal, permission: { allowed: true, isOwner: false } };
      }
    }

    // 3. PLANET_MEMBERS
    if (journal.visibility === 'PLANET_MEMBERS' && journal.planetId) {
      const membership = await this.prisma.db.planetMembership.findFirst({
        where: {
          planetId: journal.planetId,
          userId,
          leftAt: null,
        },
        select: { id: true },
      });
      if (membership) {
        return { journal, permission: { allowed: true, isOwner: false } };
      }
    }

    // 4. PUBLIC
    if (journal.visibility === 'PUBLIC') {
      return { journal, permission: { allowed: true, isOwner: false } };
    }

    // 5. Default deny — return journal info but denied
    return { journal, permission: { allowed: false, isOwner: false } };
  }
}
