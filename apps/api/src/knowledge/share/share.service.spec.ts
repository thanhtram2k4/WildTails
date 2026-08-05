import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ShareService } from './share.service';
import type { PrismaService } from '../../database/prisma.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDb() {
  return {
    journal: { findFirst: vi.fn() },
    user: { findFirst: vi.fn() },
    sharePermission: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(makeDb())),
  };
}

type Db = ReturnType<typeof makeDb>;

function makePrisma(db: Db): PrismaService {
  return { db } as unknown as PrismaService;
}

const now = new Date('2025-06-01T00:00:00Z');

function makeShareRow(
  overrides: Partial<{
    id: string;
    journalId: string;
    grantedToUserId: string;
    grantedByUserId: string;
    expiresAt: Date | null;
    revokedAt: Date | null;
  }> = {},
) {
  return {
    id: 'share-1',
    journalId: 'journal-1',
    grantedToUserId: 'guest-1',
    grantedByUserId: 'owner-1',
    expiresAt: null,
    revokedAt: null,
    createdAt: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// ShareService.grant
// ---------------------------------------------------------------------------

describe('ShareService.grant', () => {
  let db: Db;
  let service: ShareService;

  beforeEach(() => {
    db = makeDb();
    service = new ShareService(makePrisma(db));
    db.$transaction.mockImplementation((fn: (tx: Db) => unknown) => fn(db));
  });

  it('creates a share and audit log for a valid grant', async () => {
    db.journal.findFirst.mockResolvedValue({ id: 'journal-1', visibility: 'SELECTED_USERS' });
    db.user.findFirst.mockResolvedValue({ id: 'guest-1' });
    db.sharePermission.create.mockResolvedValue(makeShareRow());
    db.auditLog.create.mockResolvedValue({});

    const result = await service.grant('journal-1', 'owner-1', 'guest-1');

    expect(result.id).toBe('share-1');
    expect(result.userId).toBe('guest-1');
    expect(result.grantedBy).toBe('owner-1');

    expect(db.sharePermission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          journalId: 'journal-1',
          grantedToUserId: 'guest-1',
          grantedByUserId: 'owner-1',
        }),
      }),
    );
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'SHARE_GRANT',
          userId: 'owner-1',
        }),
      }),
    );
  });

  it('sets expiresAt when provided', async () => {
    db.journal.findFirst.mockResolvedValue({ id: 'journal-1', visibility: 'SELECTED_USERS' });
    db.user.findFirst.mockResolvedValue({ id: 'guest-1' });
    db.sharePermission.create.mockResolvedValue(
      makeShareRow({ expiresAt: new Date('2025-12-31T00:00:00Z') }),
    );

    const result = await service.grant(
      'journal-1',
      'owner-1',
      'guest-1',
      '2025-12-31T00:00:00.000Z',
    );

    expect(result.expiresAt).toBe('2025-12-31T00:00:00.000Z');
    expect(db.sharePermission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ expiresAt: expect.any(Date) }),
      }),
    );
  });

  it('throws BadRequestException when owner tries to share with themselves', async () => {
    await expect(service.grant('journal-1', 'owner-1', 'owner-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    // Must short-circuit before any DB query
    expect(db.journal.findFirst).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when journal is not owned by the granting user', async () => {
    db.journal.findFirst.mockResolvedValue(null); // not found for this owner

    await expect(service.grant('journal-1', 'attacker', 'guest-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    // Ownership check must scope by ownerId
    expect(db.journal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 'attacker' }),
      }),
    );
    expect(db.sharePermission.create).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when journal visibility is not SELECTED_USERS', async () => {
    db.journal.findFirst.mockResolvedValue({ id: 'journal-1', visibility: 'PUBLIC' });

    await expect(service.grant('journal-1', 'owner-1', 'guest-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(db.sharePermission.create).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when journal visibility is PRIVATE', async () => {
    db.journal.findFirst.mockResolvedValue({ id: 'journal-1', visibility: 'PRIVATE' });

    await expect(service.grant('journal-1', 'owner-1', 'guest-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws NotFoundException when recipient user does not exist', async () => {
    db.journal.findFirst.mockResolvedValue({ id: 'journal-1', visibility: 'SELECTED_USERS' });
    db.user.findFirst.mockResolvedValue(null);

    await expect(service.grant('journal-1', 'owner-1', 'ghost-user')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.sharePermission.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when an active share already exists (P2002 from Prisma)', async () => {
    db.journal.findFirst.mockResolvedValue({ id: 'journal-1', visibility: 'SELECTED_USERS' });
    db.user.findFirst.mockResolvedValue({ id: 'guest-1' });

    const prismaUniqueError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    db.sharePermission.create.mockRejectedValue(prismaUniqueError);

    await expect(service.grant('journal-1', 'owner-1', 'guest-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('does not expose the audit log body or journal body in the response', async () => {
    db.journal.findFirst.mockResolvedValue({ id: 'journal-1', visibility: 'SELECTED_USERS' });
    db.user.findFirst.mockResolvedValue({ id: 'guest-1' });
    db.sharePermission.create.mockResolvedValue(makeShareRow());

    const result = await service.grant('journal-1', 'owner-1', 'guest-1');

    expect(result).not.toHaveProperty('body');
    expect(result).not.toHaveProperty('metadata');
  });
});

// ---------------------------------------------------------------------------
// ShareService.listActive
// ---------------------------------------------------------------------------

describe('ShareService.listActive', () => {
  let db: Db;
  let service: ShareService;

  beforeEach(() => {
    db = makeDb();
    service = new ShareService(makePrisma(db));
  });

  it('returns only non-revoked share permissions', async () => {
    db.journal.findFirst.mockResolvedValue({ id: 'journal-1' });
    db.sharePermission.findMany.mockResolvedValue([
      makeShareRow({ id: 'share-1', revokedAt: null }),
    ]);

    const result = await service.listActive('journal-1', 'owner-1');

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('share-1');
    expect(db.sharePermission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ journalId: 'journal-1', revokedAt: null }),
      }),
    );
  });

  it('returns empty array when all shares are revoked', async () => {
    db.journal.findFirst.mockResolvedValue({ id: 'journal-1' });
    db.sharePermission.findMany.mockResolvedValue([]);

    const result = await service.listActive('journal-1', 'owner-1');

    expect(result).toEqual([]);
  });

  it('throws NotFoundException when journal is not owned by the requesting user', async () => {
    db.journal.findFirst.mockResolvedValue(null);

    await expect(service.listActive('journal-1', 'attacker')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.journal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 'attacker' }),
      }),
    );
    expect(db.sharePermission.findMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// ShareService.revoke
// ---------------------------------------------------------------------------

describe('ShareService.revoke', () => {
  let db: Db;
  let service: ShareService;

  beforeEach(() => {
    db = makeDb();
    service = new ShareService(makePrisma(db));
    db.$transaction.mockImplementation((fn: (tx: Db) => unknown) => fn(db));
  });

  it('sets revokedAt and creates audit log on successful revoke', async () => {
    db.journal.findFirst.mockResolvedValue({ id: 'journal-1' });
    db.sharePermission.findFirst.mockResolvedValue({ id: 'share-1' });
    db.sharePermission.update.mockResolvedValue({});
    db.auditLog.create.mockResolvedValue({});

    const result = await service.revoke('journal-1', 'share-1', 'owner-1');

    expect(result).toEqual({ revoked: true });
    expect(db.sharePermission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'share-1' },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      }),
    );
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'SHARE_REVOKE',
          targetType: 'SharePermission',
          targetId: 'share-1',
          userId: 'owner-1',
        }),
      }),
    );
  });

  it('throws NotFoundException when journal is not owned by the revoking user', async () => {
    db.journal.findFirst.mockResolvedValue(null);

    await expect(service.revoke('journal-1', 'share-1', 'attacker')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.journal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 'attacker' }),
      }),
    );
    expect(db.sharePermission.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when permission is already revoked (revokedAt != null)', async () => {
    db.journal.findFirst.mockResolvedValue({ id: 'journal-1' });
    // The query filters revokedAt: null — an already revoked permission returns null
    db.sharePermission.findFirst.mockResolvedValue(null);

    await expect(service.revoke('journal-1', 'share-1', 'owner-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.sharePermission.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when permission does not belong to the journal', async () => {
    db.journal.findFirst.mockResolvedValue({ id: 'journal-1' });
    // Permission query includes journalId constraint — cross-journal share returns null
    db.sharePermission.findFirst.mockResolvedValue(null);

    await expect(
      service.revoke('journal-1', 'share-from-other-journal', 'owner-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(db.sharePermission.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ journalId: 'journal-1' }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Cross-account negative authorization
// ---------------------------------------------------------------------------

describe('ShareService — negative authorization', () => {
  let db: Db;
  let service: ShareService;

  beforeEach(() => {
    db = makeDb();
    service = new ShareService(makePrisma(db));
    db.$transaction.mockImplementation((fn: (tx: Db) => unknown) => fn(db));
  });

  it('grant cannot be performed by a non-owner of the journal', async () => {
    db.journal.findFirst.mockResolvedValue(null); // journal not found for attacker

    await expect(service.grant('victim-journal', 'attacker', 'accomplice')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.sharePermission.create).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it('listActive cannot be called by a non-owner of the journal', async () => {
    db.journal.findFirst.mockResolvedValue(null);

    await expect(service.listActive('victim-journal', 'attacker')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.sharePermission.findMany).not.toHaveBeenCalled();
  });

  it('revoke cannot be performed by a non-owner of the journal', async () => {
    db.journal.findFirst.mockResolvedValue(null);

    await expect(service.revoke('victim-journal', 'share-1', 'attacker')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.sharePermission.update).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });
});
