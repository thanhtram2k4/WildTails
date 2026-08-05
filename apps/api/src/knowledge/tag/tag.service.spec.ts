import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TagService } from './tag.service';
import type { PrismaService } from '../../database/prisma.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDb() {
  return {
    tag: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  };
}

type Db = ReturnType<typeof makeDb>;

function makePrisma(db: Db): PrismaService {
  return { db } as unknown as PrismaService;
}

function makeTagRow(overrides: Partial<{ id: string; name: string; ownerId: string }> = {}) {
  return {
    id: 'tag-1',
    name: 'my-tag',
    ownerId: 'user-1',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// TagService.create
// ---------------------------------------------------------------------------

describe('TagService.create', () => {
  let db: Db;
  let service: TagService;

  beforeEach(() => {
    db = makeDb();
    service = new TagService(makePrisma(db));
  });

  it('normalizes: trims leading and trailing whitespace', async () => {
    db.tag.create.mockResolvedValue(makeTagRow({ name: 'science' }));

    await service.create('user-1', '  science  ');

    expect(db.tag.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'science' }),
      }),
    );
  });

  it('normalizes: lowercases the name', async () => {
    db.tag.create.mockResolvedValue(makeTagRow({ name: 'physics' }));

    await service.create('user-1', 'Physics');

    expect(db.tag.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'physics' }),
      }),
    );
  });

  it('normalizes: collapses repeated internal whitespace to single space', async () => {
    db.tag.create.mockResolvedValue(makeTagRow({ name: 'machine learning' }));

    await service.create('user-1', 'machine   learning');

    expect(db.tag.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'machine learning' }),
      }),
    );
  });

  it('normalizes: applies NFKC unicode normalization (half-width to full-width)', async () => {
    // "\uFF41\uFF42\uFF43" are fullwidth Latin letters a, b, c
    // NFKC normalizes them to "abc"
    db.tag.create.mockResolvedValue(makeTagRow({ name: 'abc' }));

    await service.create('user-1', '\uFF41\uFF42\uFF43');

    expect(db.tag.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'abc' }),
      }),
    );
  });

  it('stores tag with the calling userId as ownerId', async () => {
    db.tag.create.mockResolvedValue(makeTagRow());

    await service.create('user-1', 'science');

    expect(db.tag.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: 'user-1' }),
      }),
    );
  });

  it('throws ConflictException when Prisma reports unique constraint violation (P2002)', async () => {
    const prismaError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    db.tag.create.mockRejectedValue(prismaError);

    await expect(service.create('user-1', 'duplicate-tag')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('re-throws unexpected Prisma errors without wrapping', async () => {
    const unexpectedError = new Error('Connection lost');
    db.tag.create.mockRejectedValue(unexpectedError);

    await expect(service.create('user-1', 'some-tag')).rejects.toThrow('Connection lost');
  });

  it('returns a TagResponse with id, name, ownerId', async () => {
    db.tag.create.mockResolvedValue(
      makeTagRow({ id: 'tag-99', name: 'science', ownerId: 'user-1' }),
    );

    const result = await service.create('user-1', 'Science');

    expect(result.id).toBe('tag-99');
    expect(result.name).toBe('science');
    expect(result.ownerId).toBe('user-1');
  });
});

// ---------------------------------------------------------------------------
// TagService.list
// ---------------------------------------------------------------------------

describe('TagService.list', () => {
  let db: Db;
  let service: TagService;

  beforeEach(() => {
    db = makeDb();
    service = new TagService(makePrisma(db));
  });

  it('returns tags owned by the user', async () => {
    db.tag.findMany.mockResolvedValue([
      makeTagRow({ id: 'tag-1', name: 'alpha' }),
      makeTagRow({ id: 'tag-2', name: 'beta' }),
    ]);

    const result = await service.list('user-1');

    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe('alpha');
  });

  it('always filters by ownerId to prevent cross-user exposure', async () => {
    db.tag.findMany.mockResolvedValue([]);

    await service.list('user-1');

    expect(db.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 'user-1' }),
      }),
    );
  });

  it('returns empty array when user has no tags', async () => {
    db.tag.findMany.mockResolvedValue([]);

    const result = await service.list('user-1');

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// TagService.remove
// ---------------------------------------------------------------------------

describe('TagService.remove', () => {
  let db: Db;
  let service: TagService;

  beforeEach(() => {
    db = makeDb();
    service = new TagService(makePrisma(db));
  });

  it('deletes the tag when it belongs to the user', async () => {
    db.tag.findFirst.mockResolvedValue({ id: 'tag-1' });
    db.tag.delete.mockResolvedValue({});

    const result = await service.remove('tag-1', 'user-1');

    expect(result).toEqual({ deleted: true });
    expect(db.tag.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'tag-1' } }));
  });

  it('throws NotFoundException when tag does not belong to the user', async () => {
    db.tag.findFirst.mockResolvedValue(null);

    await expect(service.remove('tag-1', 'other-user')).rejects.toBeInstanceOf(NotFoundException);

    expect(db.tag.delete).not.toHaveBeenCalled();
  });

  it('scopes the ownership check to the calling userId to prevent cross-user deletion', async () => {
    db.tag.findFirst.mockResolvedValue(null);

    await expect(service.remove('victim-tag', 'attacker')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.tag.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'victim-tag', ownerId: 'attacker' }),
      }),
    );
    expect(db.tag.delete).not.toHaveBeenCalled();
  });
});
