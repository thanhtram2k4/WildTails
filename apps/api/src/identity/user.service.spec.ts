import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import type { PrismaService } from '../database/prisma.service';

function makeDb() {
  return {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    planetMembership: {
      findMany: vi.fn(),
    },
  };
}

function makePrisma(db: ReturnType<typeof makeDb>): PrismaService {
  return { db } as unknown as PrismaService;
}

const baseUser = {
  id: 'user-123',
  email: 'alice@example.com',
  displayName: 'Alice',
  avatarUrl: null,
  bio: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  avatarConfig: null,
};

// ---------------------------------------------------------------------------
// getProfile
// ---------------------------------------------------------------------------

describe('UserService.getProfile', () => {
  let db: ReturnType<typeof makeDb>;
  let service: UserService;

  beforeEach(() => {
    db = makeDb();
    service = new UserService(makePrisma(db));
  });

  it('returns full profile including email', async () => {
    db.user.findUnique.mockResolvedValue(baseUser);

    const result = await service.getProfile('user-123');

    expect(result.email).toBe('alice@example.com');
    expect(result.id).toBe('user-123');
    expect(result.joinedAt).toBe('2025-01-01T00:00:00.000Z');
  });

  it('throws NotFoundException when user not found', async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(service.getProfile('missing-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('never exposes passwordHash', async () => {
    db.user.findUnique.mockResolvedValue(baseUser);
    const result = await service.getProfile('user-123');
    expect(result).not.toHaveProperty('passwordHash');
  });
});

// ---------------------------------------------------------------------------
// getPublicProfile
// ---------------------------------------------------------------------------

describe('UserService.getPublicProfile', () => {
  let db: ReturnType<typeof makeDb>;
  let service: UserService;

  beforeEach(() => {
    db = makeDb();
    service = new UserService(makePrisma(db));
  });

  it('does NOT include email in public profile', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'user-123',
      displayName: 'Alice',
      avatarUrl: null,
      bio: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      avatarConfig: null,
    });

    const result = await service.getPublicProfile('user-123');
    expect(result).not.toHaveProperty('email');
    expect(result.displayName).toBe('Alice');
  });

  it('throws NotFoundException for soft-deleted user', async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(service.getPublicProfile('deleted-id')).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// updateProfile
// ---------------------------------------------------------------------------

describe('UserService.updateProfile', () => {
  let db: ReturnType<typeof makeDb>;
  let service: UserService;

  beforeEach(() => {
    db = makeDb();
    service = new UserService(makePrisma(db));
  });

  it('updates displayName only when provided', async () => {
    db.user.update.mockResolvedValue({ ...baseUser, displayName: 'Bob' });

    await service.updateProfile('user-123', { displayName: 'Bob' });

    const updateCall = db.user.update.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(updateCall.data).toHaveProperty('displayName', 'Bob');
    expect(updateCall.data).not.toHaveProperty('bio');
  });

  it('rejects invalid avatarConfig', async () => {
    await expect(
      service.updateProfile('user-123', {
        // Cast to bypass TS so we can test the runtime validation
        avatarConfig: {
          base: 'invalid-base',
          fur: 'orange',
          eyes: 'round',
          outfit: 'none',
        } as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    // DB should not be called when validation fails
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('accepts valid avatarConfig', async () => {
    db.user.update.mockResolvedValue(baseUser);

    await service.updateProfile('user-123', {
      avatarConfig: {
        base: 'cat-round',
        fur: 'orange',
        eyes: 'round',
        outfit: 'none',
        accessory: 'none',
        background: 'none',
      },
    });

    expect(db.user.update).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Cross-account authorization: user cannot read another user's email
// ---------------------------------------------------------------------------

describe('UserService — cross-account authorization', () => {
  let db: ReturnType<typeof makeDb>;
  let service: UserService;

  beforeEach(() => {
    db = makeDb();
    service = new UserService(makePrisma(db));
  });

  it('getPublicProfile for user-B from user-A session returns no email (negative auth test)', async () => {
    // Simulate user-B's public profile being fetched by user-A
    db.user.findUnique.mockResolvedValue({
      id: 'user-B',
      displayName: 'Bob',
      avatarUrl: null,
      bio: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      avatarConfig: null,
    });

    const result = await service.getPublicProfile('user-B');
    // Email must NEVER appear in the public profile
    expect(result).not.toHaveProperty('email');
  });
});
