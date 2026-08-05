import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommentService } from './comment.service';
import type { PrismaService } from '../../database/prisma.service';

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

function makeDb() {
  return {
    post: {
      findFirst: vi.fn(),
    },
    planetMembership: {
      findUnique: vi.fn(),
    },
    comment: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
}

function makePrisma(db: ReturnType<typeof makeDb>): PrismaService {
  return { db } as unknown as PrismaService;
}

const PLANET_ID = 'planet-aaaa-aaaa-aaaa-000000000001';
const USER_ID = 'user-aaaa-aaaa-aaaa-000000000001';
const OTHER_USER_ID = 'user-aaaa-aaaa-aaaa-000000000002';
const POST_ID = 'post-aaaa-aaaa-aaaa-000000000001';
const COMMENT_ID = 'comment-aaa-aaaa-aaaa-000000000001';
const PARENT_ID = 'comment-aaa-aaaa-aaaa-000000000002';
const NOW = new Date('2025-06-01T12:00:00Z');

const activePost = { id: POST_ID, planetId: PLANET_ID };
const activeMembership = { leftAt: null };
const formerMembership = { leftAt: new Date('2025-05-01') };

const baseComment = {
  id: COMMENT_ID,
  body: 'Great post!',
  authorId: USER_ID,
  postId: POST_ID,
  parentId: null,
  createdAt: NOW,
};

// ---------------------------------------------------------------------------
// CommentService.create
// ---------------------------------------------------------------------------

describe('CommentService.create — top-level comment', () => {
  let db: ReturnType<typeof makeDb>;
  let service: CommentService;

  beforeEach(() => {
    db = makeDb();
    service = new CommentService(makePrisma(db));
  });

  it('creates a top-level comment for active member', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.comment.create.mockResolvedValue(baseComment);

    const result = await service.create(POST_ID, USER_ID, {
      body: 'Great post!',
      postId: POST_ID,
    });

    expect(result.id).toBe(COMMENT_ID);
    expect(result.parentId).toBeUndefined();
  });

  it('creates a reply to a top-level comment', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.comment.findFirst.mockResolvedValue({
      id: PARENT_ID,
      postId: POST_ID,
      parentId: null, // top-level
    });
    db.comment.create.mockResolvedValue({ ...baseComment, parentId: PARENT_ID });

    const result = await service.create(POST_ID, USER_ID, {
      body: 'Great reply!',
      postId: POST_ID,
      parentId: PARENT_ID,
    });

    expect(result.parentId).toBe(PARENT_ID);
  });

  it('rejects reply to a reply (depth > 1, D23)', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.comment.findFirst.mockResolvedValue({
      id: PARENT_ID,
      postId: POST_ID,
      parentId: COMMENT_ID, // already a reply itself
    });

    await expect(
      service.create(POST_ID, USER_ID, {
        body: 'Nested!',
        postId: POST_ID,
        parentId: PARENT_ID,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects reply with parent belonging to a different post', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.comment.findFirst.mockResolvedValue({
      id: PARENT_ID,
      postId: 'different-post-id',
      parentId: null,
    });

    await expect(
      service.create(POST_ID, USER_ID, {
        body: 'Wrong parent!',
        postId: POST_ID,
        parentId: PARENT_ID,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects comment on a deleted post', async () => {
    db.post.findFirst.mockResolvedValue(null);

    await expect(
      service.create(POST_ID, USER_ID, { body: 'Hi!', postId: POST_ID }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects comment by non-member', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(null);

    await expect(
      service.create(POST_ID, USER_ID, { body: 'Hi!', postId: POST_ID }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects comment by former member', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(formerMembership);

    await expect(
      service.create(POST_ID, USER_ID, { body: 'Hi!', postId: POST_ID }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('validates parent exists (returns 404 if parent not found)', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.comment.findFirst.mockResolvedValue(null);

    await expect(
      service.create(POST_ID, USER_ID, {
        body: 'Reply!',
        postId: POST_ID,
        parentId: 'nonexistent-parent',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// CommentService.list
// ---------------------------------------------------------------------------

describe('CommentService.list', () => {
  let db: ReturnType<typeof makeDb>;
  let service: CommentService;

  beforeEach(() => {
    db = makeDb();
    service = new CommentService(makePrisma(db));
  });

  it('lists paginated comments for active member', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.comment.findMany.mockResolvedValue([baseComment]);

    const result = await service.list(POST_ID, USER_ID);

    expect(result.data).toHaveLength(1);
    expect(result.meta.hasMore).toBe(false);
  });

  it('query excludes deleted comments (deletedAt: null in where)', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.comment.findMany.mockResolvedValue([]);

    await service.list(POST_ID, USER_ID);

    expect(db.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it('query excludes moderated comments (moderatedAt: null in where)', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.comment.findMany.mockResolvedValue([]);

    await service.list(POST_ID, USER_ID);

    expect(db.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ moderatedAt: null }),
      }),
    );
  });

  it('returns 404 for non-member attempting to list comments', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(null);

    await expect(service.list(POST_ID, USER_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

// ---------------------------------------------------------------------------
// CommentService.deleteByOwner
// ---------------------------------------------------------------------------

describe('CommentService.deleteByOwner', () => {
  let db: ReturnType<typeof makeDb>;
  let service: CommentService;

  beforeEach(() => {
    db = makeDb();
    service = new CommentService(makePrisma(db));
  });

  it('sets deletedAt on owner delete', async () => {
    db.comment.findFirst.mockResolvedValue({ id: COMMENT_ID });
    db.comment.update.mockResolvedValue({});

    const result = await service.deleteByOwner(COMMENT_ID, USER_ID);

    expect(result).toEqual({ deleted: true });
    expect(db.comment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it('allows former member to delete own comment (no membership check)', async () => {
    db.comment.findFirst.mockResolvedValue({ id: COMMENT_ID });
    db.comment.update.mockResolvedValue({});

    const result = await service.deleteByOwner(COMMENT_ID, USER_ID);

    expect(result).toEqual({ deleted: true });
    // Membership must NOT be queried
    expect(db.planetMembership.findUnique).not.toHaveBeenCalled();
  });

  it('rejects delete of non-owned comment', async () => {
    db.comment.findFirst.mockResolvedValue(null);

    await expect(service.deleteByOwner(COMMENT_ID, OTHER_USER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
