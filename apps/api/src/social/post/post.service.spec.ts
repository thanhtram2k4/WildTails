import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostService } from './post.service';
import type { PrismaService } from '../../database/prisma.service';

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

function makeDb() {
  return {
    planetMembership: {
      findUnique: vi.fn(),
    },
    planet: {
      findUnique: vi.fn(),
    },
    journal: {
      findFirst: vi.fn(),
    },
    goal: {
      findFirst: vi.fn(),
    },
    post: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    reaction: {
      groupBy: vi.fn(),
    },
    comment: {
      groupBy: vi.fn(),
      count: vi.fn(),
    },
  };
}

function makePrisma(db: ReturnType<typeof makeDb>): PrismaService {
  return { db } as unknown as PrismaService;
}

const NOW = new Date('2025-06-01T12:00:00Z');
const PLANET_ID = 'planet-aaaa-aaaa-aaaa-000000000001';
const USER_ID = 'user-aaaa-aaaa-aaaa-000000000001';
const OTHER_USER_ID = 'user-aaaa-aaaa-aaaa-000000000002';
const POST_ID = 'post-aaaa-aaaa-aaaa-000000000001';
const JOURNAL_ID = 'journal-aaa-aaaa-aaaa-000000000001';
const GOAL_ID = 'goal-aaaa-aaaa-aaaa-000000000001';

const activeMembership = { role: 'MEMBER', leftAt: null };
const formerMembership = { role: 'MEMBER', leftAt: new Date('2025-05-01T00:00:00Z') };

const baseAuthor = { id: USER_ID, displayName: 'Test User', avatarUrl: null };

const basePost = {
  id: POST_ID,
  body: 'Hello planet!',
  authorId: USER_ID,
  planetId: PLANET_ID,
  type: 'ORIGINAL' as const,
  goalId: null,
  journalId: null,
  createdAt: NOW,
  updatedAt: NOW,
  author: baseAuthor,
};

// ---------------------------------------------------------------------------
// PostService.create
// ---------------------------------------------------------------------------

describe('PostService.create — ORIGINAL post', () => {
  let db: ReturnType<typeof makeDb>;
  let service: PostService;

  beforeEach(() => {
    db = makeDb();
    service = new PostService(makePrisma(db));
  });

  it('creates an ORIGINAL post successfully for an active member', async () => {
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.post.create.mockResolvedValue(basePost);

    const result = await service.create(USER_ID, {
      body: 'Hello planet!',
      planetId: PLANET_ID,
      type: 'ORIGINAL',
    });

    expect(result.id).toBe(POST_ID);
    expect(result.body).toBe('Hello planet!');
    expect(result.type).toBe('ORIGINAL');
  });

  it('response never contains journalId (D24)', async () => {
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.post.create.mockResolvedValue(basePost);

    const result = await service.create(USER_ID, {
      body: 'Hello!',
      planetId: PLANET_ID,
      type: 'ORIGINAL',
    });

    expect(result).not.toHaveProperty('journalId');
    expect(JSON.stringify(result)).not.toContain('journalId');
  });

  it('response includes author embed with id, displayName, avatarUrl only (D27)', async () => {
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.post.create.mockResolvedValue({
      ...basePost,
      author: { id: USER_ID, displayName: 'Cat User', avatarUrl: 'https://example.com/avatar.png' },
    });

    const result = await service.create(USER_ID, {
      body: 'Hello!',
      planetId: PLANET_ID,
      type: 'ORIGINAL',
    });

    expect(result.author).toMatchObject({
      id: USER_ID,
      displayName: 'Cat User',
      avatarUrl: 'https://example.com/avatar.png',
    });
    // Must not include email, role, avatarConfig, passwordHash
    expect(result.author).not.toHaveProperty('email');
    expect(result.author).not.toHaveProperty('role');
    expect(result.author).not.toHaveProperty('avatarConfig');
    expect(result.author).not.toHaveProperty('passwordHash');
  });

  it('rejects post from non-member (no membership record)', async () => {
    db.planetMembership.findUnique.mockResolvedValue(null);

    await expect(
      service.create(USER_ID, { body: 'Hi', planetId: PLANET_ID, type: 'ORIGINAL' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects post from former member (leftAt is set)', async () => {
    db.planetMembership.findUnique.mockResolvedValue(formerMembership);

    await expect(
      service.create(USER_ID, { body: 'Hi', planetId: PLANET_ID, type: 'ORIGINAL' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('PostService.create — JOURNAL_SHARE post', () => {
  let db: ReturnType<typeof makeDb>;
  let service: PostService;

  beforeEach(() => {
    db = makeDb();
    service = new PostService(makePrisma(db));
  });

  it('creates JOURNAL_SHARE post when journal is owned by user', async () => {
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.journal.findFirst.mockResolvedValue({ id: JOURNAL_ID });
    db.post.create.mockResolvedValue({
      ...basePost,
      type: 'JOURNAL_SHARE',
      journalId: JOURNAL_ID,
    });

    const result = await service.create(USER_ID, {
      body: 'Sharing journal',
      planetId: PLANET_ID,
      type: 'JOURNAL_SHARE',
      journalId: JOURNAL_ID,
    });

    expect(result.type).toBe('JOURNAL_SHARE');
    // journalId must NOT appear in response (D24)
    expect(result).not.toHaveProperty('journalId');
  });

  it('rejects JOURNAL_SHARE without journalId', async () => {
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);

    await expect(
      service.create(USER_ID, { body: 'Hi', planetId: PLANET_ID, type: 'JOURNAL_SHARE' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects JOURNAL_SHARE when journal is not owned by user', async () => {
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.journal.findFirst.mockResolvedValue(null);

    await expect(
      service.create(USER_ID, {
        body: 'Hi',
        planetId: PLANET_ID,
        type: 'JOURNAL_SHARE',
        journalId: JOURNAL_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PostService.create — GOAL_UPDATE post', () => {
  let db: ReturnType<typeof makeDb>;
  let service: PostService;

  beforeEach(() => {
    db = makeDb();
    service = new PostService(makePrisma(db));
  });

  it('creates GOAL_UPDATE post when goal is owned by user', async () => {
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.goal.findFirst.mockResolvedValue({ id: GOAL_ID });
    db.post.create.mockResolvedValue({
      ...basePost,
      type: 'GOAL_UPDATE',
      goalId: GOAL_ID,
    });

    const result = await service.create(USER_ID, {
      body: 'Goal update!',
      planetId: PLANET_ID,
      type: 'GOAL_UPDATE',
      goalId: GOAL_ID,
    });

    expect(result.type).toBe('GOAL_UPDATE');
    expect(result.goalId).toBe(GOAL_ID);
  });

  it('rejects GOAL_UPDATE without goalId', async () => {
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);

    await expect(
      service.create(USER_ID, { body: 'Hi', planetId: PLANET_ID, type: 'GOAL_UPDATE' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// PostService.listFeed
// ---------------------------------------------------------------------------

describe('PostService.listFeed', () => {
  let db: ReturnType<typeof makeDb>;
  let service: PostService;

  beforeEach(() => {
    db = makeDb();
    service = new PostService(makePrisma(db));
    // default: planet exists
    db.planet.findUnique.mockResolvedValue({ id: PLANET_ID });
  });

  it('returns paginated feed for active member', async () => {
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.post.findMany.mockResolvedValue([basePost]);
    db.reaction.groupBy.mockResolvedValue([]);
    db.comment.groupBy.mockResolvedValue([]);

    const result = await service.listFeed(PLANET_ID, USER_ID);

    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe(POST_ID);
    expect(result.meta.hasMore).toBe(false);
    expect(result.meta.cursor).toBeNull();
  });

  it('returns empty result when no posts', async () => {
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.post.findMany.mockResolvedValue([]);
    db.reaction.groupBy.mockResolvedValue([]);
    db.comment.groupBy.mockResolvedValue([]);

    const result = await service.listFeed(PLANET_ID, USER_ID);

    expect(result.data).toHaveLength(0);
    expect(result.meta.hasMore).toBe(false);
  });

  it('excludes deleted posts (query filter includes deletedAt: null)', async () => {
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.post.findMany.mockResolvedValue([]);
    db.reaction.groupBy.mockResolvedValue([]);
    db.comment.groupBy.mockResolvedValue([]);

    await service.listFeed(PLANET_ID, USER_ID);

    expect(db.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null, moderatedAt: null }),
      }),
    );
  });

  it('excludes moderated posts (query filter includes moderatedAt: null)', async () => {
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.post.findMany.mockResolvedValue([]);
    db.reaction.groupBy.mockResolvedValue([]);
    db.comment.groupBy.mockResolvedValue([]);

    await service.listFeed(PLANET_ID, USER_ID);

    expect(db.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ moderatedAt: null }),
      }),
    );
  });

  it('generates hasMore=true and cursor when results exceed limit', async () => {
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    // Return limit+1 posts to trigger hasMore
    const posts = Array.from({ length: 3 }, (_, i) => ({
      ...basePost,
      id: `post-${i}`,
      createdAt: new Date(NOW.getTime() - i * 1000),
    }));
    db.post.findMany.mockResolvedValue(posts);
    db.reaction.groupBy.mockResolvedValue([]);
    db.comment.groupBy.mockResolvedValue([]);

    const result = await service.listFeed(PLANET_ID, USER_ID, undefined, 2);

    expect(result.data).toHaveLength(2);
    expect(result.meta.hasMore).toBe(true);
    expect(result.meta.cursor).toBeTruthy();
    // cursor is a valid base64url string
    expect(() => {
      const raw = Buffer.from(result.meta.cursor!, 'base64url').toString('utf8');
      JSON.parse(raw);
    }).not.toThrow();
  });

  it('rejects feed access for non-member', async () => {
    db.planetMembership.findUnique.mockResolvedValue(null);

    await expect(service.listFeed(PLANET_ID, USER_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects feed access for former member', async () => {
    db.planetMembership.findUnique.mockResolvedValue(formerMembership);

    await expect(service.listFeed(PLANET_ID, USER_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

// ---------------------------------------------------------------------------
// PostService.findById
// ---------------------------------------------------------------------------

describe('PostService.findById', () => {
  let db: ReturnType<typeof makeDb>;
  let service: PostService;

  beforeEach(() => {
    db = makeDb();
    service = new PostService(makePrisma(db));
  });

  it('returns post for active member', async () => {
    db.post.findFirst.mockResolvedValue(basePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.reaction.groupBy.mockResolvedValue([]);
    db.comment.count.mockResolvedValue(0);

    const result = await service.findById(POST_ID, USER_ID);

    expect(result.id).toBe(POST_ID);
  });

  it('returns privacy-safe 404 for non-member', async () => {
    db.post.findFirst.mockResolvedValue(basePost);
    db.planetMembership.findUnique.mockResolvedValue(null);

    await expect(service.findById(POST_ID, USER_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns privacy-safe 404 for deleted post', async () => {
    db.post.findFirst.mockResolvedValue(null); // findFirst with deletedAt:null returns null for deleted

    await expect(service.findById(POST_ID, USER_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// PostService.deleteByOwner
// ---------------------------------------------------------------------------

describe('PostService.deleteByOwner', () => {
  let db: ReturnType<typeof makeDb>;
  let service: PostService;

  beforeEach(() => {
    db = makeDb();
    service = new PostService(makePrisma(db));
  });

  it('sets deletedAt on owner delete', async () => {
    db.post.findFirst.mockResolvedValue({ id: POST_ID });
    db.post.update.mockResolvedValue({});

    const result = await service.deleteByOwner(POST_ID, USER_ID);

    expect(result).toEqual({ deleted: true });
    expect(db.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it('returns 404 for non-owned post', async () => {
    db.post.findFirst.mockResolvedValue(null);

    await expect(service.deleteByOwner(POST_ID, OTHER_USER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('allows former member to delete own existing post (no membership check)', async () => {
    // Former member scenario: membership not checked for owner delete
    db.post.findFirst.mockResolvedValue({ id: POST_ID });
    db.post.update.mockResolvedValue({});

    // No membership mock needed — former members can delete their own posts
    const result = await service.deleteByOwner(POST_ID, USER_ID);

    expect(result).toEqual({ deleted: true });
    // Membership table must NOT be queried for owner delete
    expect(db.planetMembership.findUnique).not.toHaveBeenCalled();
  });
});
