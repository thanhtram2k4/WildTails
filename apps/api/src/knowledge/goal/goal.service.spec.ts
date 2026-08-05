import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GoalService } from './goal.service';
import type { PrismaService } from '../../database/prisma.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDb() {
  return {
    goal: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
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

function makeGoalRow(
  overrides: Partial<{
    id: string;
    title: string;
    ownerId: string;
    progress: number;
    deadline: Date | null;
    description: string | null;
    planetId: string | null;
  }> = {},
) {
  return {
    id: 'goal-1',
    title: 'Learn Rust',
    description: null,
    ownerId: 'user-1',
    progress: 0,
    deadline: null,
    planetId: null,
    createdAt: now,
    updatedAt: now,
    _count: { journals: 0 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// GoalService.create
// ---------------------------------------------------------------------------

describe('GoalService.create', () => {
  let db: Db;
  let service: GoalService;

  beforeEach(() => {
    db = makeDb();
    service = new GoalService(makePrisma(db));
    db.goal.create.mockResolvedValue(makeGoalRow());
  });

  it('creates a goal with all fields', async () => {
    db.goal.create.mockResolvedValue(
      makeGoalRow({
        title: 'Finish thesis',
        description: 'Write all chapters',
        deadline: new Date('2025-12-31T00:00:00Z'),
        progress: 0,
      }),
    );

    const result = await service.create('user-1', {
      title: 'Finish thesis',
      description: 'Write all chapters',
      deadline: '2025-12-31T00:00:00.000Z',
    });

    expect(result.title).toBe('Finish thesis');
    expect(result.description).toBe('Write all chapters');
    expect(result.deadline).toBe('2025-12-31T00:00:00.000Z');
    expect(result.progress).toBe(0);

    expect(db.goal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Finish thesis',
          ownerId: 'user-1',
          deadline: expect.any(Date),
        }),
      }),
    );
  });

  it('creates a goal without a deadline', async () => {
    db.goal.create.mockResolvedValue(makeGoalRow({ deadline: null }));

    const result = await service.create('user-1', { title: 'Open-ended goal' });

    expect(result.deadline).toBeNull();
    expect(db.goal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deadline: null }),
      }),
    );
  });

  it('sets ownerId from the service parameter, not from client payload', async () => {
    await service.create('user-1', { title: 'My goal' });

    expect(db.goal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: 'user-1' }),
      }),
    );
  });

  it('returns a GoalResponse including linkedJournalCount', async () => {
    db.goal.create.mockResolvedValue(makeGoalRow({ id: 'goal-99' }));

    const result = await service.create('user-1', { title: 'Test' });

    expect(result.id).toBe('goal-99');
    expect(typeof result.linkedJournalCount).toBe('number');
    expect(typeof result.createdAt).toBe('string');
    expect(typeof result.updatedAt).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// GoalService.list
// ---------------------------------------------------------------------------

describe('GoalService.list', () => {
  let db: Db;
  let service: GoalService;

  beforeEach(() => {
    db = makeDb();
    service = new GoalService(makePrisma(db));
  });

  it('returns own goals with linkedJournalCount', async () => {
    db.goal.findMany.mockResolvedValue([makeGoalRow({ id: 'g-1' }), makeGoalRow({ id: 'g-2' })]);

    const result = await service.list('user-1', { limit: 20 });

    expect(result.data).toHaveLength(2);
    expect(result.data[0]!.linkedJournalCount).toBe(0);
    expect(result.meta.hasMore).toBe(false);
  });

  it('always filters by ownerId', async () => {
    db.goal.findMany.mockResolvedValue([]);

    await service.list('user-1', { limit: 20 });

    expect(db.goal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 'user-1' }),
      }),
    );
  });

  it('returns hasMore=true and cursor when result exceeds limit', async () => {
    db.goal.findMany.mockResolvedValue([
      makeGoalRow({ id: 'g-1' }),
      makeGoalRow({ id: 'g-2' }),
      makeGoalRow({ id: 'g-3' }), // extra item signals hasMore
    ]);

    const result = await service.list('user-1', { limit: 2 });

    expect(result.data).toHaveLength(2);
    expect(result.meta.hasMore).toBe(true);
    expect(result.meta.cursor).not.toBeNull();
  });

  it('throws BadRequestException for a malformed cursor', async () => {
    await expect(
      service.list('user-1', { limit: 20, cursor: 'bad-cursor' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// GoalService.findById
// ---------------------------------------------------------------------------

describe('GoalService.findById', () => {
  let db: Db;
  let service: GoalService;

  beforeEach(() => {
    db = makeDb();
    service = new GoalService(makePrisma(db));
  });

  it('returns the goal for the owner', async () => {
    db.goal.findFirst.mockResolvedValue(makeGoalRow({ id: 'goal-1', ownerId: 'user-1' }));

    const result = await service.findById('goal-1', 'user-1');

    expect(result.id).toBe('goal-1');
    expect(db.goal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'goal-1', ownerId: 'user-1' }),
      }),
    );
  });

  it('throws NotFoundException when goal does not belong to user', async () => {
    db.goal.findFirst.mockResolvedValue(null);

    await expect(service.findById('goal-1', 'other-user')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws NotFoundException when goal does not exist', async () => {
    db.goal.findFirst.mockResolvedValue(null);

    await expect(service.findById('missing-goal', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

// ---------------------------------------------------------------------------
// GoalService.update
// ---------------------------------------------------------------------------

describe('GoalService.update', () => {
  let db: Db;
  let service: GoalService;

  beforeEach(() => {
    db = makeDb();
    service = new GoalService(makePrisma(db));
  });

  it('updates the title', async () => {
    db.goal.findFirst.mockResolvedValue({ id: 'goal-1' });
    db.goal.update.mockResolvedValue(makeGoalRow({ title: 'New Title' }));

    const result = await service.update('goal-1', 'user-1', { title: 'New Title' });

    expect(result.title).toBe('New Title');
    expect(db.goal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'New Title' }),
      }),
    );
  });

  it('updates progress', async () => {
    db.goal.findFirst.mockResolvedValue({ id: 'goal-1' });
    db.goal.update.mockResolvedValue(makeGoalRow({ progress: 50 }));

    const result = await service.update('goal-1', 'user-1', { progress: 50 });

    expect(result.progress).toBe(50);
    expect(db.goal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ progress: 50 }),
      }),
    );
  });

  it('updates deadline to a new date', async () => {
    const newDeadline = '2026-12-31T23:59:59.000Z';
    db.goal.findFirst.mockResolvedValue({ id: 'goal-1' });
    db.goal.update.mockResolvedValue(makeGoalRow({ deadline: new Date(newDeadline) }));

    const result = await service.update('goal-1', 'user-1', { deadline: newDeadline });

    expect(result.deadline).toBe(newDeadline);
    expect(db.goal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deadline: new Date(newDeadline) }),
      }),
    );
  });

  it('throws NotFoundException when goal does not belong to user', async () => {
    db.goal.findFirst.mockResolvedValue(null); // ownership check fails

    await expect(service.update('goal-1', 'other-user', { title: 'Hack' })).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.goal.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// GoalService.remove
// ---------------------------------------------------------------------------

describe('GoalService.remove', () => {
  let db: Db;
  let service: GoalService;

  beforeEach(() => {
    db = makeDb();
    service = new GoalService(makePrisma(db));
    db.$transaction.mockImplementation((fn: (tx: Db) => unknown) => fn(db));
  });

  it('unlinks journals, then hard-deletes the goal', async () => {
    db.goal.findFirst.mockResolvedValue({ id: 'goal-1' });
    db.journal.updateMany.mockResolvedValue({ count: 3 });
    db.goal.delete.mockResolvedValue({});

    const result = await service.remove('goal-1', 'user-1');

    expect(result).toEqual({ deleted: true });

    // Journals linked to this goal must be unlinked first
    expect(db.journal.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ goalId: 'goal-1', ownerId: 'user-1' }),
        data: { goalId: null },
      }),
    );
    // Goal is hard-deleted (no soft delete)
    expect(db.goal.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'goal-1' } }),
    );
  });

  it('throws NotFoundException when goal does not belong to user', async () => {
    db.goal.findFirst.mockResolvedValue(null);

    await expect(service.remove('goal-1', 'other-user')).rejects.toBeInstanceOf(NotFoundException);

    expect(db.goal.delete).not.toHaveBeenCalled();
    expect(db.journal.updateMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Cross-account negative authorization
// ---------------------------------------------------------------------------

describe('GoalService — negative authorization', () => {
  let db: Db;
  let service: GoalService;

  beforeEach(() => {
    db = makeDb();
    service = new GoalService(makePrisma(db));
    db.$transaction.mockImplementation((fn: (tx: Db) => unknown) => fn(db));
  });

  it('findById scopes ownership check to calling userId', async () => {
    db.goal.findFirst.mockResolvedValue(null);

    await expect(service.findById('victim-goal', 'attacker')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.goal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'victim-goal', ownerId: 'attacker' }),
      }),
    );
  });

  it('update scopes ownership check to calling userId', async () => {
    db.goal.findFirst.mockResolvedValue(null);

    await expect(
      service.update('victim-goal', 'attacker', { title: 'Exploit' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(db.goal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'victim-goal', ownerId: 'attacker' }),
      }),
    );
    expect(db.goal.update).not.toHaveBeenCalled();
  });

  it('remove scopes ownership check to calling userId', async () => {
    db.goal.findFirst.mockResolvedValue(null);

    await expect(service.remove('victim-goal', 'attacker')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.goal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'victim-goal', ownerId: 'attacker' }),
      }),
    );
    expect(db.goal.delete).not.toHaveBeenCalled();
  });

  it('remove unlinks only journals owned by the same user (no cross-user unlink)', async () => {
    db.goal.findFirst.mockResolvedValue({ id: 'goal-1' });
    db.journal.updateMany.mockResolvedValue({ count: 1 });
    db.goal.delete.mockResolvedValue({});

    await service.remove('goal-1', 'user-1');

    // Journal updateMany must include ownerId constraint
    expect(db.journal.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ goalId: 'goal-1', ownerId: 'user-1' }),
      }),
    );
  });
});
