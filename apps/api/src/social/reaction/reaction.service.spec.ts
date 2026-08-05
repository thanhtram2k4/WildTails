import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReactionService } from './reaction.service';
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
    reaction: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn(),
    },
  };
}

function makePrisma(
  db: ReturnType<typeof makeDb> & { $transaction?: ReturnType<typeof vi.fn> },
): PrismaService {
  return { db } as unknown as PrismaService;
}

const PLANET_ID = 'planet-aaaa-aaaa-aaaa-000000000001';
const USER_ID = 'user-aaaa-aaaa-aaaa-000000000001';
const POST_ID = 'post-aaaa-aaaa-aaaa-000000000001';

const activePost = { id: POST_ID, planetId: PLANET_ID };
const activeMembership = { leftAt: null };

// ---------------------------------------------------------------------------
// ReactionService.toggle
// ---------------------------------------------------------------------------

describe('ReactionService.toggle', () => {
  let db: ReturnType<typeof makeDb> & { $transaction: ReturnType<typeof vi.fn> };
  let service: ReactionService;

  beforeEach(() => {
    const baseDb = makeDb();
    db = { ...baseDb, $transaction: vi.fn() };
    db.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb(baseDb);
    });
    service = new ReactionService(makePrisma(db));
  });

  it('creates a new reaction when none exists', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.reaction.findUnique
      .mockResolvedValueOnce(null) // inside transaction: no existing
      .mockResolvedValueOnce(null); // buildResponse: no userReaction
    db.reaction.create.mockResolvedValue({ id: 'r1', type: 'LIKE' });
    db.reaction.groupBy.mockResolvedValue([{ type: 'LIKE', _count: { id: 1 }, postId: POST_ID }]);

    const result = await service.toggle(POST_ID, USER_ID, 'LIKE');

    expect(result.postId).toBe(POST_ID);
    expect(result.counts['LIKE']).toBe(1);
  });

  it('removes reaction when same type toggled again', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.reaction.findUnique
      .mockResolvedValueOnce({ id: 'r1', type: 'LIKE' }) // inside transaction: existing same type
      .mockResolvedValueOnce(null); // buildResponse: no userReaction after delete
    db.reaction.delete.mockResolvedValue({});
    db.reaction.groupBy.mockResolvedValue([]);

    const result = await service.toggle(POST_ID, USER_ID, 'LIKE');

    expect(db.reaction.delete).toHaveBeenCalled();
    expect(result.userReaction).toBeUndefined();
  });

  it('switches reaction to new type when different type provided', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.reaction.findUnique
      .mockResolvedValueOnce({ id: 'r1', type: 'LIKE' }) // inside transaction: existing different type
      .mockResolvedValueOnce({ type: 'INSIGHTFUL' }); // buildResponse: new userReaction
    db.reaction.update.mockResolvedValue({ id: 'r1', type: 'INSIGHTFUL' });
    db.reaction.groupBy.mockResolvedValue([
      { type: 'INSIGHTFUL', _count: { id: 1 }, postId: POST_ID },
    ]);

    const result = await service.toggle(POST_ID, USER_ID, 'INSIGHTFUL');

    expect(db.reaction.update).toHaveBeenCalled();
    expect(result.userReaction).toBe('INSIGHTFUL');
  });

  it('rejects reaction from non-member', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(null);

    await expect(service.toggle(POST_ID, USER_ID, 'LIKE')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects reaction on deleted/moderated post (findFirst returns null)', async () => {
    db.post.findFirst.mockResolvedValue(null);

    await expect(service.toggle(POST_ID, USER_ID, 'LIKE')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('self-reaction is allowed (D28) — active author can react to own post', async () => {
    // Author reacts to their own post — no restriction
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.reaction.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ type: 'FUNNY' });
    db.reaction.create.mockResolvedValue({});
    db.reaction.groupBy.mockResolvedValue([{ type: 'FUNNY', _count: { id: 1 }, postId: POST_ID }]);

    const result = await service.toggle(POST_ID, USER_ID, 'FUNNY');

    expect(result.postId).toBe(POST_ID);
  });
});

// ---------------------------------------------------------------------------
// ReactionService.getCounts
// ---------------------------------------------------------------------------

describe('ReactionService.getCounts', () => {
  let db: ReturnType<typeof makeDb>;
  let service: ReactionService;

  beforeEach(() => {
    db = makeDb();
    service = new ReactionService(makePrisma(db));
  });

  it('returns reaction counts for active member', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.reaction.groupBy.mockResolvedValue([
      { type: 'LIKE', _count: { id: 3 }, postId: POST_ID },
      { type: 'INSIGHTFUL', _count: { id: 1 }, postId: POST_ID },
    ]);
    db.reaction.findUnique.mockResolvedValue({ type: 'LIKE' });

    const result = await service.getCounts(POST_ID, USER_ID);

    expect(result.counts['LIKE']).toBe(3);
    expect(result.counts['INSIGHTFUL']).toBe(1);
  });

  it('includes userReaction when caller has reacted', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.reaction.groupBy.mockResolvedValue([]);
    db.reaction.findUnique.mockResolvedValue({ type: 'SUPPORTIVE' });

    const result = await service.getCounts(POST_ID, USER_ID);

    expect(result.userReaction).toBe('SUPPORTIVE');
  });

  it('userReaction is absent when caller has not reacted', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(activeMembership);
    db.reaction.groupBy.mockResolvedValue([]);
    db.reaction.findUnique.mockResolvedValue(null);

    const result = await service.getCounts(POST_ID, USER_ID);

    expect(result.userReaction).toBeUndefined();
  });

  it('rejects non-member from getting counts', async () => {
    db.post.findFirst.mockResolvedValue(activePost);
    db.planetMembership.findUnique.mockResolvedValue(null);

    await expect(service.getCounts(POST_ID, USER_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
