import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JournalService } from './journal.service';
import { JournalPermissionService } from './journal-permission.service';
import type { PrismaService } from '../../database/prisma.service';
import { JOURNAL_MAX_TAGS } from '@wildtails/contracts';
import type { CreateJournalRequest } from '@wildtails/contracts';

/** Helper to create a valid CreateJournalRequest with defaults */
function createReq(
  overrides: Partial<CreateJournalRequest> & { title: string },
): CreateJournalRequest {
  return { visibility: 'PRIVATE', ...overrides };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDb() {
  return {
    journal: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    journalVersion: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    journalTag: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    tag: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    folder: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    goal: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    sharePermission: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    user: { findFirst: vi.fn() },
    planetMembership: { findFirst: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(makeDb())),
  };
}

type Db = ReturnType<typeof makeDb>;

function makePrisma(db: Db): PrismaService {
  return { db } as unknown as PrismaService;
}

function makePermissions(db: Db): JournalPermissionService {
  return new JournalPermissionService(makePrisma(db));
}

const now = new Date('2025-06-01T00:00:00Z');

/** A minimal journal row returned by Prisma includes. */
function makeJournalRow(
  overrides: Partial<{
    id: string;
    ownerId: string;
    visibility: string;
    body: string | null;
    deletedAt: Date | null;
  }> = {},
) {
  return {
    id: 'journal-1',
    title: 'My Journal',
    body: 'Some content',
    ownerId: 'user-1',
    planetId: null,
    visibility: 'PRIVATE',
    folderId: null,
    goalId: null,
    deletedAt: null,
    tags: [],
    folder: null,
    goal: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// JournalService.create
// ---------------------------------------------------------------------------

describe('JournalService.create', () => {
  let db: Db;
  let service: JournalService;

  beforeEach(() => {
    db = makeDb();
    service = new JournalService(makePrisma(db), makePermissions(db));

    // $transaction passes its tx arg through; make the inner tx use the same mocks
    db.$transaction.mockImplementation((fn: (tx: Db) => unknown) => fn(db));
    db.journal.create.mockResolvedValue(makeJournalRow());
    // findByIdAsOwner is called after create
    db.journal.findFirst.mockResolvedValue(makeJournalRow());
  });

  it('defaults visibility to PRIVATE when not specified', async () => {
    await service.create('user-1', createReq({ title: 'Test' }));

    expect(db.journal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ visibility: 'PRIVATE', ownerId: 'user-1' }),
      }),
    );
  });

  it('creates journal with explicit visibility', async () => {
    await service.create('user-1', createReq({ title: 'Public Post', visibility: 'PUBLIC' }));

    expect(db.journal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ visibility: 'PUBLIC' }),
      }),
    );
  });

  it('creates journal tags when tagIds provided', async () => {
    db.tag.count.mockResolvedValue(2);

    await service.create(
      'user-1',
      createReq({
        title: 'Tagged',
        tagIds: ['tag-a', 'tag-b'],
      }),
    );

    expect(db.journalTag.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ tagId: 'tag-a' }),
          expect.objectContaining({ tagId: 'tag-b' }),
        ]),
      }),
    );
  });

  it('creates journal with a valid folder', async () => {
    db.folder.findFirst.mockResolvedValue({ id: 'folder-1' });

    await service.create('user-1', createReq({ title: 'Foldered', folderId: 'folder-1' }));

    expect(db.journal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ folderId: 'folder-1' }),
      }),
    );
  });

  it('creates journal with a valid goal', async () => {
    db.goal.findFirst.mockResolvedValue({ id: 'goal-1' });

    await service.create('user-1', createReq({ title: 'With Goal', goalId: 'goal-1' }));

    expect(db.journal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ goalId: 'goal-1' }),
      }),
    );
  });

  it('throws BadRequestException when tagIds length exceeds JOURNAL_MAX_TAGS', async () => {
    const tooManyTags = Array.from({ length: JOURNAL_MAX_TAGS + 1 }, (_, i) => `tag-${i}`);

    await expect(
      service.create('user-1', createReq({ title: 'Test', tagIds: tooManyTags })),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(db.journal.create).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when a tagId does not belong to the user', async () => {
    db.tag.count.mockResolvedValue(0); // tag not found for this user

    await expect(
      service.create('user-1', createReq({ title: 'Test', tagIds: ['foreign-tag'] })),
    ).rejects.toBeInstanceOf(BadRequestException);

    // Validates tag ownership — must filter by ownerId
    expect(db.tag.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 'user-1' }),
      }),
    );
    expect(db.journal.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when folderId does not belong to the user', async () => {
    db.folder.findFirst.mockResolvedValue(null);

    await expect(
      service.create('user-1', createReq({ title: 'Test', folderId: 'foreign-folder' })),
    ).rejects.toBeInstanceOf(NotFoundException);

    // Must scope folder lookup by ownerId
    expect(db.folder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 'user-1' }),
      }),
    );
  });

  it('throws NotFoundException when goalId does not belong to the user', async () => {
    db.goal.findFirst.mockResolvedValue(null);

    await expect(
      service.create('user-1', createReq({ title: 'Test', goalId: 'foreign-goal' })),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(db.goal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 'user-1' }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// JournalService.list
// ---------------------------------------------------------------------------

describe('JournalService.list', () => {
  let db: Db;
  let service: JournalService;

  beforeEach(() => {
    db = makeDb();
    service = new JournalService(makePrisma(db), makePermissions(db));
  });

  it('returns journals owned by the user', async () => {
    db.journal.findMany.mockResolvedValue([makeJournalRow()]);

    const result = await service.list('user-1', { limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe('journal-1');
    expect(result.meta.hasMore).toBe(false);
  });

  it('always filters by ownerId and deletedAt: null', async () => {
    db.journal.findMany.mockResolvedValue([]);

    await service.list('user-1', { limit: 20 });

    expect(db.journal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 'user-1', deletedAt: null }),
      }),
    );
  });

  it('applies folderId filter when provided', async () => {
    db.journal.findMany.mockResolvedValue([]);

    await service.list('user-1', { limit: 20, folderId: 'folder-1' });

    expect(db.journal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ folderId: 'folder-1' }),
      }),
    );
  });

  it('applies tagId filter when provided', async () => {
    db.journal.findMany.mockResolvedValue([]);

    await service.list('user-1', { limit: 20, tagId: 'tag-1' });

    expect(db.journal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tags: { some: { tagId: 'tag-1' } } }),
      }),
    );
  });

  it('applies goalId filter when provided', async () => {
    db.journal.findMany.mockResolvedValue([]);

    await service.list('user-1', { limit: 20, goalId: 'goal-1' });

    expect(db.journal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ goalId: 'goal-1' }),
      }),
    );
  });

  it('returns hasMore=true and nextCursor when result exceeds limit', async () => {
    const rows = [
      makeJournalRow({ id: 'j-1' }),
      makeJournalRow({ id: 'j-2' }),
      makeJournalRow({ id: 'j-3' }), // extra item signals hasMore
    ];
    db.journal.findMany.mockResolvedValue(rows);

    const result = await service.list('user-1', { limit: 2 });

    expect(result.data).toHaveLength(2);
    expect(result.meta.hasMore).toBe(true);
    expect(result.meta.cursor).not.toBeNull();
  });

  it('throws BadRequestException for a malformed cursor', async () => {
    await expect(
      service.list('user-1', { limit: 20, cursor: 'not-a-valid-cursor' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// JournalService.findById
// ---------------------------------------------------------------------------

describe('JournalService.findById', () => {
  let db: Db;
  let service: JournalService;

  beforeEach(() => {
    db = makeDb();
    service = new JournalService(makePrisma(db), makePermissions(db));
  });

  it('returns journal for the owner', async () => {
    // checkReadPermission → journal.findFirst returns owner's journal
    db.journal.findFirst
      .mockResolvedValueOnce(makeJournalRow({ ownerId: 'user-1' })) // permission check
      .mockResolvedValueOnce(makeJournalRow({ ownerId: 'user-1' })); // findByIdAsOwner

    const result = await service.findById('journal-1', 'user-1');

    expect(result.id).toBe('journal-1');
  });

  it('throws NotFoundException when journal does not exist', async () => {
    db.journal.findFirst.mockResolvedValue(null); // permission check returns null

    await expect(service.findById('missing', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when non-owner requests a PRIVATE journal (default deny)', async () => {
    // Permission service returns journal with PRIVATE visibility — non-owner denied
    db.journal.findFirst.mockResolvedValue(
      makeJournalRow({ ownerId: 'owner-user', visibility: 'PRIVATE' }),
    );

    await expect(service.findById('journal-1', 'other-user')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws NotFoundException for soft-deleted journal', async () => {
    // deletedAt filter is on the query; mock returns null (simulating filtered out)
    db.journal.findFirst.mockResolvedValue(null);

    await expect(service.findById('deleted-journal', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

// ---------------------------------------------------------------------------
// JournalService.update
// ---------------------------------------------------------------------------

describe('JournalService.update', () => {
  let db: Db;
  let service: JournalService;

  beforeEach(() => {
    db = makeDb();
    service = new JournalService(makePrisma(db), makePermissions(db));
    db.$transaction.mockImplementation((fn: (tx: Db) => unknown) => fn(db));
    // findByIdAsOwner call after update
    db.journal.findFirst
      .mockResolvedValueOnce({
        id: 'journal-1',
        body: 'Original body',
        title: 'Old Title',
        visibility: 'PRIVATE',
      })
      .mockResolvedValue(makeJournalRow());
  });

  it('updates title only without creating a version snapshot', async () => {
    await service.update('journal-1', 'user-1', { title: 'New Title' });

    expect(db.journalVersion.create).not.toHaveBeenCalled();
    expect(db.journal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'New Title' }),
      }),
    );
  });

  it('creates a version snapshot when body changes', async () => {
    await service.update('journal-1', 'user-1', { body: 'Updated body' });

    expect(db.journalVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          journalId: 'journal-1',
          body: 'Original body',
          editedById: 'user-1',
        }),
      }),
    );
  });

  it('does not create a version when body is sent unchanged', async () => {
    await service.update('journal-1', 'user-1', { body: 'Original body' });

    expect(db.journalVersion.create).not.toHaveBeenCalled();
  });

  it('revokes all active shares when visibility changes away from SELECTED_USERS', async () => {
    db.journal.findFirst.mockReset();
    db.journal.findFirst
      .mockResolvedValueOnce({
        id: 'journal-1',
        body: 'body',
        title: 'Title',
        visibility: 'SELECTED_USERS',
      })
      .mockResolvedValue(makeJournalRow({ visibility: 'PRIVATE' }));

    await service.update('journal-1', 'user-1', { visibility: 'PRIVATE' });

    expect(db.sharePermission.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ journalId: 'journal-1', revokedAt: null }),
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      }),
    );
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'SHARE_REVOKE_ALL', targetId: 'journal-1' }),
      }),
    );
  });

  it('does not revoke shares when visibility stays SELECTED_USERS', async () => {
    db.journal.findFirst.mockReset();
    db.journal.findFirst
      .mockResolvedValueOnce({
        id: 'journal-1',
        body: 'body',
        title: 'Title',
        visibility: 'SELECTED_USERS',
      })
      .mockResolvedValue(makeJournalRow());

    await service.update('journal-1', 'user-1', { visibility: 'SELECTED_USERS' });

    expect(db.sharePermission.updateMany).not.toHaveBeenCalled();
  });

  it('reassigns tags when tagIds provided', async () => {
    db.tag.count.mockResolvedValue(1);

    await service.update('journal-1', 'user-1', { tagIds: ['new-tag'] });

    expect(db.journalTag.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ journalId: 'journal-1' }) }),
    );
    expect(db.journalTag.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: [{ journalId: 'journal-1', tagId: 'new-tag' }] }),
    );
  });

  it('throws NotFoundException when journal is not owned by user', async () => {
    db.journal.findFirst.mockReset();
    db.journal.findFirst.mockResolvedValue(null); // ownership check fails

    await expect(
      service.update('journal-1', 'other-user', { title: 'Hack' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(db.journal.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// JournalService.softDelete
// ---------------------------------------------------------------------------

describe('JournalService.softDelete', () => {
  let db: Db;
  let service: JournalService;

  beforeEach(() => {
    db = makeDb();
    service = new JournalService(makePrisma(db), makePermissions(db));
    db.$transaction.mockImplementation((fn: (tx: Db) => unknown) => fn(db));
  });

  it('sets deletedAt and creates an audit log', async () => {
    db.journal.findFirst.mockResolvedValue({ id: 'journal-1' });

    const result = await service.softDelete('journal-1', 'user-1');

    expect(result).toEqual({ deleted: true });
    expect(db.journal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'journal-1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'JOURNAL_DELETE',
          targetType: 'Journal',
          targetId: 'journal-1',
          userId: 'user-1',
        }),
      }),
    );
  });

  it('throws NotFoundException when journal is not owned by user', async () => {
    db.journal.findFirst.mockResolvedValue(null);

    await expect(service.softDelete('journal-1', 'other-user')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.journal.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException for already soft-deleted journal', async () => {
    // deletedAt: null filter in query means a deleted journal returns null
    db.journal.findFirst.mockResolvedValue(null);

    await expect(service.softDelete('journal-1', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

// ---------------------------------------------------------------------------
// JournalService.listVersions
// ---------------------------------------------------------------------------

describe('JournalService.listVersions', () => {
  let db: Db;
  let service: JournalService;

  beforeEach(() => {
    db = makeDb();
    service = new JournalService(makePrisma(db), makePermissions(db));
  });

  it('returns versions ordered newest first', async () => {
    db.journal.findFirst.mockResolvedValue({ id: 'journal-1' });
    db.journalVersion.findMany.mockResolvedValue([
      { id: 'v2', body: 'Second version', createdAt: new Date('2025-06-02T00:00:00Z') },
      { id: 'v1', body: 'First version', createdAt: new Date('2025-06-01T00:00:00Z') },
    ]);

    const result = await service.listVersions('journal-1', 'user-1');

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('v2');
    expect(result[1]!.id).toBe('v1');
    expect(db.journalVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });

  it('throws NotFoundException when journal not owned by user', async () => {
    db.journal.findFirst.mockResolvedValue(null);

    await expect(service.listVersions('journal-1', 'other-user')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.journalVersion.findMany).not.toHaveBeenCalled();
  });

  it('returns empty array when journal has no versions', async () => {
    db.journal.findFirst.mockResolvedValue({ id: 'journal-1' });
    db.journalVersion.findMany.mockResolvedValue([]);

    const result = await service.listVersions('journal-1', 'user-1');

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Cross-account negative authorization
// ---------------------------------------------------------------------------

describe('JournalService — negative authorization', () => {
  let db: Db;
  let service: JournalService;

  beforeEach(() => {
    db = makeDb();
    service = new JournalService(makePrisma(db), makePermissions(db));
    db.$transaction.mockImplementation((fn: (tx: Db) => unknown) => fn(db));
  });

  it('update always scopes ownership check to the calling userId', async () => {
    db.journal.findFirst.mockResolvedValue(null); // attacker cannot find victim's journal

    await expect(
      service.update('victim-journal', 'attacker-id', { title: 'Hijack' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(db.journal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 'attacker-id' }),
      }),
    );
  });

  it('softDelete always scopes ownership check to the calling userId', async () => {
    db.journal.findFirst.mockResolvedValue(null);

    await expect(service.softDelete('victim-journal', 'attacker-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.journal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 'attacker-id' }),
      }),
    );
  });

  it('listVersions always scopes ownership check to the calling userId', async () => {
    db.journal.findFirst.mockResolvedValue(null);

    await expect(service.listVersions('victim-journal', 'attacker-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.journal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 'attacker-id' }),
      }),
    );
  });
});
