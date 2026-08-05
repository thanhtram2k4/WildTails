import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FolderService } from './folder.service';
import type { PrismaService } from '../../database/prisma.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDb() {
  return {
    folder: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    journal: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(makeDb())),
  };
}

type Db = ReturnType<typeof makeDb>;

function makePrisma(db: Db): PrismaService {
  return { db } as unknown as PrismaService;
}

const now = new Date('2025-06-01T00:00:00Z');

function makeFolderRow(
  overrides: Partial<{
    id: string;
    ownerId: string;
    parentId: string | null;
    name: string;
  }> = {},
) {
  return {
    id: 'folder-1',
    name: 'My Folder',
    ownerId: 'user-1',
    parentId: null,
    createdAt: now,
    _count: { journals: 0 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// FolderService.create
// ---------------------------------------------------------------------------

describe('FolderService.create', () => {
  let db: Db;
  let service: FolderService;

  beforeEach(() => {
    db = makeDb();
    service = new FolderService(makePrisma(db));
    db.folder.create.mockResolvedValue(makeFolderRow());
  });

  it('creates a root folder with no parentId', async () => {
    await service.create('user-1', { name: 'Root' });

    expect(db.folder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Root', ownerId: 'user-1', parentId: undefined }),
      }),
    );
    // validateParent should not be called for root folders
    expect(db.folder.findFirst).not.toHaveBeenCalled();
  });

  it('creates a nested folder after validating parent belongs to user', async () => {
    // validateParent calls findFirst to load the parent
    db.folder.findFirst.mockResolvedValue(makeFolderRow({ id: 'parent-1', parentId: null }));
    db.folder.create.mockResolvedValue(makeFolderRow({ parentId: 'parent-1' }));

    const result = await service.create('user-1', { name: 'Nested', parentId: 'parent-1' });

    expect(result.parentId).toBe('parent-1');
    expect(db.folder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'parent-1', ownerId: 'user-1' }),
      }),
    );
  });

  it('throws NotFoundException when parentId does not belong to the user', async () => {
    db.folder.findFirst.mockResolvedValue(null); // parent not found for this user

    await expect(
      service.create('user-1', { name: 'Nested', parentId: 'foreign-folder' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(db.folder.create).not.toHaveBeenCalled();
  });

  it('returns a FolderResponse with journalCount', async () => {
    db.folder.create.mockResolvedValue(makeFolderRow({ id: 'f-new' }));

    const result = await service.create('user-1', { name: 'Test' });

    expect(result.id).toBe('f-new');
    expect(typeof result.journalCount).toBe('number');
    expect(typeof result.createdAt).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// FolderService.list
// ---------------------------------------------------------------------------

describe('FolderService.list', () => {
  let db: Db;
  let service: FolderService;

  beforeEach(() => {
    db = makeDb();
    service = new FolderService(makePrisma(db));
  });

  it('returns own folders with journalCount', async () => {
    db.folder.findMany.mockResolvedValue([
      makeFolderRow({ id: 'f-1' }),
      makeFolderRow({ id: 'f-2' }),
    ]);

    const result = await service.list('user-1', { limit: 20 });

    expect(result.data).toHaveLength(2);
    expect(result.data[0]!.journalCount).toBe(0);
    expect(result.meta.hasMore).toBe(false);
  });

  it('always filters by ownerId', async () => {
    db.folder.findMany.mockResolvedValue([]);

    await service.list('user-1', { limit: 20 });

    expect(db.folder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 'user-1' }),
      }),
    );
  });

  it('returns hasMore=true and cursor when result exceeds limit', async () => {
    db.folder.findMany.mockResolvedValue([
      makeFolderRow({ id: 'f-1' }),
      makeFolderRow({ id: 'f-2' }),
      makeFolderRow({ id: 'f-3' }), // extra
    ]);

    const result = await service.list('user-1', { limit: 2 });

    expect(result.data).toHaveLength(2);
    expect(result.meta.hasMore).toBe(true);
    expect(result.meta.cursor).not.toBeNull();
  });

  it('throws BadRequestException for a malformed cursor', async () => {
    await expect(
      service.list('user-1', { limit: 10, cursor: 'bad-cursor' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// FolderService.update
// ---------------------------------------------------------------------------

describe('FolderService.update', () => {
  let db: Db;
  let service: FolderService;

  beforeEach(() => {
    db = makeDb();
    service = new FolderService(makePrisma(db));
    db.folder.update.mockResolvedValue(makeFolderRow());
  });

  it('renames a folder (no parent change)', async () => {
    db.folder.findFirst.mockResolvedValue({ id: 'folder-1' });

    await service.update('folder-1', 'user-1', { name: 'Renamed' });

    expect(db.folder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Renamed' }),
      }),
    );
  });

  it('throws BadRequestException when trying to set a folder as its own parent', async () => {
    db.folder.findFirst.mockResolvedValue({ id: 'folder-1' });

    await expect(
      service.update('folder-1', 'user-1', { parentId: 'folder-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(db.folder.update).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when nesting would exceed depth 3', async () => {
    // Ownership check passes
    db.folder.findFirst
      .mockResolvedValueOnce({ id: 'folder-1' }) // ownership check
      .mockResolvedValueOnce({ id: 'parent-1', parentId: 'grandparent-1' }) // parent
      .mockResolvedValueOnce({ id: 'grandparent-1', parentId: 'great-grandparent-1' }); // grandparent — depth >= 3

    await expect(
      service.update('folder-1', 'user-1', { parentId: 'parent-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(db.folder.update).not.toHaveBeenCalled();
  });

  it('throws BadRequestException on circular reference', async () => {
    // Ownership check passes; parent lookup starts building a cycle
    db.folder.findFirst
      .mockResolvedValueOnce({ id: 'folder-1' }) // ownership check
      .mockResolvedValueOnce({ id: 'parent-1', parentId: 'folder-1' }); // parent points back at folder-1

    await expect(
      service.update('folder-1', 'user-1', { parentId: 'parent-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when folder does not belong to user', async () => {
    db.folder.findFirst.mockResolvedValue(null);

    await expect(service.update('folder-1', 'other-user', { name: 'Hack' })).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.folder.update).not.toHaveBeenCalled();
  });

  it('reparents folder to a new valid parent', async () => {
    db.folder.findFirst
      .mockResolvedValueOnce({ id: 'folder-1' }) // ownership check
      .mockResolvedValueOnce({ id: 'new-parent', parentId: null }); // parent validation
    db.folder.update.mockResolvedValue(makeFolderRow({ parentId: 'new-parent' }));

    const result = await service.update('folder-1', 'user-1', { parentId: 'new-parent' });

    expect(db.folder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ parentId: 'new-parent' }),
      }),
    );
    expect(result.parentId).toBe('new-parent');
  });
});

// ---------------------------------------------------------------------------
// FolderService.remove
// ---------------------------------------------------------------------------

describe('FolderService.remove', () => {
  let db: Db;
  let service: FolderService;

  beforeEach(() => {
    db = makeDb();
    service = new FolderService(makePrisma(db));
    db.$transaction.mockImplementation((fn: (tx: Db) => unknown) => fn(db));
  });

  it('unparents journals, unparents child folders, then deletes the folder', async () => {
    db.folder.findFirst.mockResolvedValue({ id: 'folder-1' });
    db.journal.updateMany.mockResolvedValue({ count: 2 });
    db.folder.updateMany.mockResolvedValue({ count: 1 });
    db.folder.delete.mockResolvedValue({});

    const result = await service.remove('folder-1', 'user-1');

    expect(result).toEqual({ deleted: true });

    expect(db.journal.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ folderId: 'folder-1' }),
        data: { folderId: null },
      }),
    );
    expect(db.folder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ parentId: 'folder-1' }),
        data: { parentId: null },
      }),
    );
    expect(db.folder.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'folder-1' } }),
    );
  });

  it('throws NotFoundException when folder does not belong to user', async () => {
    db.folder.findFirst.mockResolvedValue(null);

    await expect(service.remove('folder-1', 'other-user')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.folder.delete).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Cross-account negative authorization
// ---------------------------------------------------------------------------

describe('FolderService — negative authorization', () => {
  let db: Db;
  let service: FolderService;

  beforeEach(() => {
    db = makeDb();
    service = new FolderService(makePrisma(db));
    db.$transaction.mockImplementation((fn: (tx: Db) => unknown) => fn(db));
  });

  it('update scopes ownership check to calling userId', async () => {
    db.folder.findFirst.mockResolvedValue(null);

    await expect(
      service.update('victim-folder', 'attacker', { name: 'Exploit' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(db.folder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 'attacker' }),
      }),
    );
    expect(db.folder.update).not.toHaveBeenCalled();
  });

  it('remove scopes ownership check to calling userId', async () => {
    db.folder.findFirst.mockResolvedValue(null);

    await expect(service.remove('victim-folder', 'attacker')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.folder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 'attacker' }),
      }),
    );
    expect(db.folder.delete).not.toHaveBeenCalled();
  });
});
