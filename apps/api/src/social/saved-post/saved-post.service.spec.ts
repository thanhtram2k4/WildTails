import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SavedPostService } from './saved-post.service';
import type { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@wildtails/database';

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
    savedPost: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    reaction: {
      groupBy: vi.fn(),
    },
    comment: {
      groupBy: vi.fn(),
    },
  };
}

function makePrisma(db: ReturnType<typeof makeDb>): PrismaService {
  return { db } as unknown as PrismaService;
}

const PLANET_ID = 'planet-aaaa-aaaa-aaaa-000000000001';
const USER_ID = 'user-aaaa-aaaa-aaaa-000000000001';
const POST_ID = 'post-aaaa-aaaa-aaaa-000000000001';
const SAVED_ID = 'saved-aaaa-aaaa-aaaa-000000000001';
const NOW = new Date('2025-06-01T12:00:00Z');

const activePost = { id: POST_ID, planetId: PLANET_ID };
const activeMembership = { leftAt: null };

const baseAuthor = { id: USER_ID, displayName: 'Test User', avatarUrl: null };
const basePostFull = {
  id: POST_ID,
  body: 'Hello!',
  authorId: USER_ID,
  planetId: PLANET_ID,
  type: 'ORIGINAL',
  goalId: null,
  createdAt: NOW,
  updatedAt: NOW,
  author: baseAuthor,
};

// ---------------------------------------------------------------------------
// SavedPostService.save
// ---------------------------------------------------------------------------

describe('SavedPostService.save', () => {
  let db: ReturnType<typeof makeDb>;
  let service: SavedPostService;

  beforeEach(() => {
    db = makeDb();
    service = new SavedPostService(makePrisma(db));
  });

  it('saves a post for an active member', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.savedPost.create.mockResolvedValue({
      id: SAVED_ID,
      postId: POST_ID,
      createdAt: NOW,
    });

    const result = await service.save(POST_ID, USER_ID);

    expect(result.postId).toBe(POST_ID);
    expect(result.savedAt).toBe(NOW.toISOString());
  });

  it('throws 409 ConflictException on duplicate save', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);

    const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.0.0',
      meta: {},
    });
    db.savedPost.create.mockRejectedValue(p2002Error);

    await expect(service.save(POST_ID, USER_ID)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects save for non-member', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(null);

    await expect(service.save(POST_ID, USER_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('self-save is allowed (D28)', async () => {
    // Author saves their own post — no restriction
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.savedPost.create.mockResolvedValue({
      id: SAVED_ID,
      postId: POST_ID,
      createdAt: NOW,
    });

    const result = await service.save(POST_ID, USER_ID);
    expect(result.postId).toBe(POST_ID);
  });

  it('returns 404 for non-existent or deleted post', async () => {
    db.post.findFirst.mockResolvedValue(null);

    await expect(service.save(POST_ID, USER_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// SavedPostService.unsave
// ---------------------------------------------------------------------------

describe('SavedPostService.unsave', () => {
  let db: ReturnType<typeof makeDb>;
  let service: SavedPostService;

  beforeEach(() => {
    db = makeDb();
    service = new SavedPostService(makePrisma(db));
  });

  it('unsaves a previously saved post', async () => {
    db.savedPost.findUnique.mockResolvedValue({ id: SAVED_ID });
    db.savedPost.delete.mockResolvedValue({});

    const result = await service.unsave(POST_ID, USER_ID);

    expect(result).toEqual({ unsaved: true });
  });

  it('throws 404 when post was not saved', async () => {
    db.savedPost.findUnique.mockResolvedValue(null);

    await expect(service.unsave(POST_ID, USER_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// SavedPostService.list
// ---------------------------------------------------------------------------

describe('SavedPostService.list', () => {
  let db: ReturnType<typeof makeDb>;
  let service: SavedPostService;

  beforeEach(() => {
    db = makeDb();
    service = new SavedPostService(makePrisma(db));
  });

  it('returns paginated saved posts for user', async () => {
    db.savedPost.findMany.mockResolvedValue([
      {
        id: SAVED_ID,
        postId: POST_ID,
        createdAt: NOW,
        post: basePostFull,
      },
    ]);
    db.reaction.groupBy.mockResolvedValue([]);
    db.comment.groupBy.mockResolvedValue([]);

    const result = await service.list(USER_ID);

    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.postId).toBe(POST_ID);
    expect(result.data[0]!.post).toBeDefined();
    expect(result.meta.hasMore).toBe(false);
  });

  it('query excludes deleted posts (post: { deletedAt: null, moderatedAt: null })', async () => {
    db.savedPost.findMany.mockResolvedValue([]);
    db.reaction.groupBy.mockResolvedValue([]);
    db.comment.groupBy.mockResolvedValue([]);

    await service.list(USER_ID);

    expect(db.savedPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          post: expect.objectContaining({ deletedAt: null, moderatedAt: null }),
        }),
      }),
    );
  });

  it('query excludes moderated posts in where clause', async () => {
    db.savedPost.findMany.mockResolvedValue([]);
    db.reaction.groupBy.mockResolvedValue([]);
    db.comment.groupBy.mockResolvedValue([]);

    await service.list(USER_ID);

    expect(db.savedPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          post: expect.objectContaining({ moderatedAt: null }),
        }),
      }),
    );
  });
});
