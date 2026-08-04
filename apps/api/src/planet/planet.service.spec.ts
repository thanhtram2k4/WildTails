import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PlanetService } from './planet.service';
import type { PrismaService } from '../database/prisma.service';

function makeDb() {
  return {
    planet: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    planetMembership: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

function makePrisma(db: ReturnType<typeof makeDb>): PrismaService {
  return { db } as unknown as PrismaService;
}

const basePlanet = {
  id: 'planet-1',
  name: 'Learning',
  slug: 'learning',
  description: null,
  iconUrl: null,
  isDefault: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  _count: { memberships: 5 },
};

// ---------------------------------------------------------------------------
// listPlanets
// ---------------------------------------------------------------------------

describe('PlanetService.listPlanets', () => {
  let db: ReturnType<typeof makeDb>;
  let service: PlanetService;

  beforeEach(() => {
    db = makeDb();
    service = new PlanetService(makePrisma(db));
  });

  it('returns planets with memberCount', async () => {
    db.planet.findMany.mockResolvedValue([basePlanet]);

    const result = await service.listPlanets();

    expect(result).toHaveLength(1);
    expect(result[0]!.memberCount).toBe(5);
    expect(result[0]!.id).toBe('planet-1');
  });

  it('returns empty array when no planets exist', async () => {
    db.planet.findMany.mockResolvedValue([]);
    const result = await service.listPlanets();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getPlanet
// ---------------------------------------------------------------------------

describe('PlanetService.getPlanet', () => {
  let db: ReturnType<typeof makeDb>;
  let service: PlanetService;

  beforeEach(() => {
    db = makeDb();
    service = new PlanetService(makePrisma(db));
  });

  it('returns planet when found', async () => {
    db.planet.findUnique.mockResolvedValue(basePlanet);

    const result = await service.getPlanet('planet-1');
    expect(result.id).toBe('planet-1');
    expect(result.memberCount).toBe(5);
  });

  it('throws NotFoundException when planet does not exist', async () => {
    db.planet.findUnique.mockResolvedValue(null);
    await expect(service.getPlanet('missing-planet')).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// join
// ---------------------------------------------------------------------------

describe('PlanetService.join', () => {
  let db: ReturnType<typeof makeDb>;
  let service: PlanetService;

  beforeEach(() => {
    db = makeDb();
    service = new PlanetService(makePrisma(db));
  });

  it('creates new membership when none exists', async () => {
    db.planet.findUnique.mockResolvedValue({ id: 'planet-1' });
    db.planetMembership.findUnique.mockResolvedValue(null);
    db.planetMembership.create.mockResolvedValue({
      planetId: 'planet-1',
      userId: 'user-1',
      role: 'MEMBER',
      joinedAt: new Date('2025-06-01T00:00:00Z'),
      leftAt: null,
    });

    const result = await service.join('planet-1', 'user-1');

    expect(result.role).toBe('MEMBER');
    expect(result.leftAt).toBeNull();
  });

  it('throws ConflictException when already an active member', async () => {
    db.planet.findUnique.mockResolvedValue({ id: 'planet-1' });
    db.planetMembership.findUnique.mockResolvedValue({
      planetId: 'planet-1',
      userId: 'user-1',
      role: 'MEMBER',
      joinedAt: new Date(),
      leftAt: null,
    });

    await expect(service.join('planet-1', 'user-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('reactivates existing membership on rejoin (D15)', async () => {
    db.planet.findUnique.mockResolvedValue({ id: 'planet-1' });
    db.planetMembership.findUnique.mockResolvedValue({
      planetId: 'planet-1',
      userId: 'user-1',
      role: 'MEMBER',
      joinedAt: new Date('2025-01-01T00:00:00Z'),
      leftAt: new Date('2025-03-01T00:00:00Z'),
    });
    db.planetMembership.update.mockResolvedValue({
      planetId: 'planet-1',
      userId: 'user-1',
      role: 'MEMBER',
      joinedAt: new Date('2025-06-01T00:00:00Z'),
      leftAt: null,
    });

    const result = await service.join('planet-1', 'user-1');

    expect(result.leftAt).toBeNull();
    expect(result.role).toBe('MEMBER');

    // Must update (not create a duplicate row)
    expect(db.planetMembership.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          planetId_userId: { planetId: 'planet-1', userId: 'user-1' },
        }),
        data: expect.objectContaining({ leftAt: null, role: 'MEMBER' }),
      }),
    );
    expect(db.planetMembership.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when planet does not exist', async () => {
    db.planet.findUnique.mockResolvedValue(null);
    await expect(service.join('ghost-planet', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// leave
// ---------------------------------------------------------------------------

describe('PlanetService.leave', () => {
  let db: ReturnType<typeof makeDb>;
  let service: PlanetService;

  beforeEach(() => {
    db = makeDb();
    service = new PlanetService(makePrisma(db));
  });

  it('sets leftAt when user is an active member', async () => {
    db.planetMembership.findUnique.mockResolvedValue({
      planetId: 'planet-1',
      userId: 'user-1',
      role: 'MEMBER',
      joinedAt: new Date(),
      leftAt: null,
    });
    db.planetMembership.update.mockResolvedValue({});

    const result = await service.leave('planet-1', 'user-1');

    expect(result).toEqual({ left: true });
    expect(db.planetMembership.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ leftAt: expect.any(Date) }),
      }),
    );
  });

  it('throws NotFoundException when no active membership exists', async () => {
    db.planetMembership.findUnique.mockResolvedValue(null);
    await expect(service.leave('planet-1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when membership already has leftAt set', async () => {
    db.planetMembership.findUnique.mockResolvedValue({
      planetId: 'planet-1',
      userId: 'user-1',
      role: 'MEMBER',
      joinedAt: new Date(),
      leftAt: new Date(),
    });
    await expect(service.leave('planet-1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// Cross-account authorization — user cannot leave on behalf of another user
// ---------------------------------------------------------------------------

describe('PlanetService — negative authorization', () => {
  let db: ReturnType<typeof makeDb>;
  let service: PlanetService;

  beforeEach(() => {
    db = makeDb();
    service = new PlanetService(makePrisma(db));
  });

  it('leave uses userId from Principal, not from request body (no cross-user action)', async () => {
    // user-A tries to leave but the lookup is scoped to user-A's ID
    // The controller always passes user.userId from the JWT
    db.planetMembership.findUnique.mockResolvedValue(null);

    // If user-B's membership is looked up with user-A's ID, it returns null → 404
    await expect(service.leave('planet-1', 'user-A-id')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.planetMembership.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          planetId_userId: { planetId: 'planet-1', userId: 'user-A-id' },
        }),
      }),
    );
  });
});
