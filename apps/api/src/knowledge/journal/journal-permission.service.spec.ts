import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JournalPermissionService } from './journal-permission.service';
import type { PrismaService } from '../../database/prisma.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDb() {
  return {
    journal: { findFirst: vi.fn() },
    sharePermission: { findFirst: vi.fn() },
    planetMembership: { findFirst: vi.fn() },
  };
}

type Db = ReturnType<typeof makeDb>;

function makePrisma(db: Db): PrismaService {
  return { db } as unknown as PrismaService;
}

function makeJournal(
  overrides: Partial<{
    id: string;
    ownerId: string;
    visibility: string;
    planetId: string | null;
  }> = {},
) {
  return {
    id: 'journal-1',
    ownerId: 'owner-1',
    visibility: 'PRIVATE',
    planetId: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Journal not found / soft-deleted
// ---------------------------------------------------------------------------

describe('JournalPermissionService — non-existent / soft-deleted', () => {
  let db: Db;
  let service: JournalPermissionService;

  beforeEach(() => {
    db = makeDb();
    service = new JournalPermissionService(makePrisma(db));
  });

  it('returns null when journal does not exist', async () => {
    db.journal.findFirst.mockResolvedValue(null);

    const result = await service.checkReadPermission('missing-id', 'user-1');

    expect(result).toBeNull();
  });

  it('returns null for a soft-deleted journal (deletedAt filter in query)', async () => {
    // The query includes { deletedAt: null }; a deleted journal returns null from Prisma
    db.journal.findFirst.mockResolvedValue(null);

    const result = await service.checkReadPermission('deleted-journal', 'user-1');

    expect(result).toBeNull();
    // Verify the query scopes out deleted journals
    expect(db.journal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Ownership
// ---------------------------------------------------------------------------

describe('JournalPermissionService — owner access', () => {
  let db: Db;
  let service: JournalPermissionService;

  beforeEach(() => {
    db = makeDb();
    service = new JournalPermissionService(makePrisma(db));
  });

  it('grants access with isOwner=true when userId matches ownerId', async () => {
    db.journal.findFirst.mockResolvedValue(makeJournal({ ownerId: 'owner-1' }));

    const result = await service.checkReadPermission('journal-1', 'owner-1');

    expect(result).not.toBeNull();
    expect(result!.permission.allowed).toBe(true);
    expect(result!.permission.isOwner).toBe(true);
    // Owner check is done purely from ownerId — no share or membership queries needed
    expect(db.sharePermission.findFirst).not.toHaveBeenCalled();
    expect(db.planetMembership.findFirst).not.toHaveBeenCalled();
  });

  it('grants access even when visibility is PRIVATE (owner always wins)', async () => {
    db.journal.findFirst.mockResolvedValue(
      makeJournal({ ownerId: 'owner-1', visibility: 'PRIVATE' }),
    );

    const result = await service.checkReadPermission('journal-1', 'owner-1');

    expect(result!.permission.allowed).toBe(true);
    expect(result!.permission.isOwner).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SELECTED_USERS
// ---------------------------------------------------------------------------

describe('JournalPermissionService — SELECTED_USERS', () => {
  let db: Db;
  let service: JournalPermissionService;

  beforeEach(() => {
    db = makeDb();
    service = new JournalPermissionService(makePrisma(db));
    db.journal.findFirst.mockResolvedValue(
      makeJournal({ ownerId: 'owner-1', visibility: 'SELECTED_USERS' }),
    );
  });

  it('allows access when a valid, non-expired, non-revoked share exists', async () => {
    db.sharePermission.findFirst.mockResolvedValue({ id: 'share-1' });

    const result = await service.checkReadPermission('journal-1', 'guest-1');

    expect(result!.permission.allowed).toBe(true);
    expect(result!.permission.isOwner).toBe(false);
    // Must query with revokedAt: null
    expect(db.sharePermission.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          journalId: 'journal-1',
          grantedToUserId: 'guest-1',
          revokedAt: null,
        }),
      }),
    );
  });

  it('denies access when share has been revoked (revokedAt is set)', async () => {
    // The query filters revokedAt: null, so a revoked share returns null
    db.sharePermission.findFirst.mockResolvedValue(null);

    const result = await service.checkReadPermission('journal-1', 'revoked-user');

    expect(result!.permission.allowed).toBe(false);
  });

  it('denies access when share has expired (expiresAt in the past)', async () => {
    // The query filters expiresAt: { gt: new Date() }, so an expired share returns null
    db.sharePermission.findFirst.mockResolvedValue(null);

    const result = await service.checkReadPermission('journal-1', 'expired-user');

    // Must include expiresAt expiry check in the query
    expect(db.sharePermission.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ expiresAt: null }),
            expect.objectContaining({ expiresAt: { gt: expect.any(Date) } }),
          ]),
        }),
      }),
    );
    expect(result!.permission.allowed).toBe(false);
  });

  it('denies access when no share exists for the requesting user', async () => {
    db.sharePermission.findFirst.mockResolvedValue(null);

    const result = await service.checkReadPermission('journal-1', 'stranger');

    expect(result!.permission.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PLANET_MEMBERS
// ---------------------------------------------------------------------------

describe('JournalPermissionService — PLANET_MEMBERS', () => {
  let db: Db;
  let service: JournalPermissionService;

  beforeEach(() => {
    db = makeDb();
    service = new JournalPermissionService(makePrisma(db));
  });

  it('allows an active planet member to read the journal', async () => {
    db.journal.findFirst.mockResolvedValue(
      makeJournal({ ownerId: 'owner-1', visibility: 'PLANET_MEMBERS', planetId: 'planet-1' }),
    );
    db.planetMembership.findFirst.mockResolvedValue({ id: 'membership-1' });

    const result = await service.checkReadPermission('journal-1', 'member-1');

    expect(result!.permission.allowed).toBe(true);
    expect(result!.permission.isOwner).toBe(false);
    expect(db.planetMembership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          planetId: 'planet-1',
          userId: 'member-1',
          leftAt: null,
        }),
      }),
    );
  });

  it('denies access when the user has left the planet (leftAt is set)', async () => {
    db.journal.findFirst.mockResolvedValue(
      makeJournal({ ownerId: 'owner-1', visibility: 'PLANET_MEMBERS', planetId: 'planet-1' }),
    );
    // leftAt: null filter means an ex-member's row returns null
    db.planetMembership.findFirst.mockResolvedValue(null);

    const result = await service.checkReadPermission('journal-1', 'ex-member');

    expect(result!.permission.allowed).toBe(false);
  });

  it('denies access when planetId is null on a PLANET_MEMBERS journal', async () => {
    db.journal.findFirst.mockResolvedValue(
      makeJournal({ ownerId: 'owner-1', visibility: 'PLANET_MEMBERS', planetId: null }),
    );

    const result = await service.checkReadPermission('journal-1', 'user-1');

    // Without a planetId the PLANET_MEMBERS branch is skipped; falls through to default deny
    expect(result!.permission.allowed).toBe(false);
    expect(db.planetMembership.findFirst).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PUBLIC
// ---------------------------------------------------------------------------

describe('JournalPermissionService — PUBLIC', () => {
  let db: Db;
  let service: JournalPermissionService;

  beforeEach(() => {
    db = makeDb();
    service = new JournalPermissionService(makePrisma(db));
    db.journal.findFirst.mockResolvedValue(
      makeJournal({ ownerId: 'owner-1', visibility: 'PUBLIC' }),
    );
  });

  it('allows any authenticated user to read a PUBLIC journal', async () => {
    const result = await service.checkReadPermission('journal-1', 'any-user');

    expect(result!.permission.allowed).toBe(true);
    expect(result!.permission.isOwner).toBe(false);
    // No extra share or membership queries needed
    expect(db.sharePermission.findFirst).not.toHaveBeenCalled();
    expect(db.planetMembership.findFirst).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PRIVATE — default deny
// ---------------------------------------------------------------------------

describe('JournalPermissionService — PRIVATE', () => {
  let db: Db;
  let service: JournalPermissionService;

  beforeEach(() => {
    db = makeDb();
    service = new JournalPermissionService(makePrisma(db));
    db.journal.findFirst.mockResolvedValue(
      makeJournal({ ownerId: 'owner-1', visibility: 'PRIVATE' }),
    );
  });

  it('denies a non-owner requesting a PRIVATE journal', async () => {
    const result = await service.checkReadPermission('journal-1', 'stranger');

    expect(result!.permission.allowed).toBe(false);
    expect(result!.permission.isOwner).toBe(false);
  });

  it('does not leak journal existence — returns the same shape regardless (not null)', async () => {
    // The service returns { journal, permission: { allowed: false } } — not null
    // This is intentional: null means "not found", false means "found but denied"
    // The caller (JournalService.findById) normalizes both to NotFoundException.
    const result = await service.checkReadPermission('journal-1', 'stranger');

    // Result is not null (journal exists), but access is denied
    expect(result).not.toBeNull();
    expect(result!.permission.allowed).toBe(false);
  });
});
