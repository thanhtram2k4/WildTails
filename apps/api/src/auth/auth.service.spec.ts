import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import type { PrismaService } from '../database/prisma.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJwtService(): JwtService {
  return { sign: vi.fn().mockReturnValue('mock.access.token') } as unknown as JwtService;
}

/** Builds a minimal db stub matching the Prisma shape used in AuthService. */
function makeDb(overrides: Record<string, unknown> = {}) {
  const user = {
    findUnique: vi.fn(),
    create: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  };
  const refreshToken = {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  };

  return {
    user,
    refreshToken,
    $transaction: vi.fn(),
    ...overrides,
  };
}

function makePrisma(db: ReturnType<typeof makeDb>): PrismaService {
  return { db } as unknown as PrismaService;
}

// ---------------------------------------------------------------------------
// register
// ---------------------------------------------------------------------------

describe('AuthService.register', () => {
  let db: ReturnType<typeof makeDb>;
  let service: AuthService;

  beforeEach(() => {
    db = makeDb();
    service = new AuthService(makePrisma(db), makeJwtService());
  });

  it('throws ConflictException when email already exists', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'existing-id' });

    await expect(
      service.register({ email: 'Alice@Example.COM', password: 'P@ssword1', displayName: 'Alice' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('normalizes email to lowercase before checking duplicate', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'existing-id' });

    await expect(
      service.register({ email: 'ALICE@EXAMPLE.COM', password: 'P@ssword1', displayName: 'Alice' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(db.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ email: 'alice@example.com' }),
      }),
    );
  });

  it('creates user and returns access + refresh tokens on success', async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue({
      id: 'new-uuid',
      email: 'alice@example.com',
      displayName: 'Alice',
      role: 'USER',
    });
    db.refreshToken.create.mockResolvedValue({});

    const result = await service.register({
      email: 'alice@example.com',
      password: 'P@ssword1',
      displayName: 'Alice',
    });

    expect(result.accessToken).toBe('mock.access.token');
    expect(typeof result.refreshToken).toBe('string');
    expect(result.refreshToken.length).toBeGreaterThan(20);
    expect(result.expiresIn).toBe(900);
  });

  it('does NOT include the raw password in the create call', async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue({
      id: 'new-uuid',
      email: 'alice@example.com',
      displayName: 'Alice',
      role: 'USER',
    });
    db.refreshToken.create.mockResolvedValue({});

    await service.register({
      email: 'alice@example.com',
      password: 'SuperSecret1!',
      displayName: 'Alice',
    });

    const createCall = db.user.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(createCall.data).not.toHaveProperty('password');
    expect(createCall.data).toHaveProperty('passwordHash');
    expect(createCall.data['passwordHash']).not.toBe('SuperSecret1!');
  });
});

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------

describe('AuthService.login', () => {
  let db: ReturnType<typeof makeDb>;
  let service: AuthService;

  beforeEach(() => {
    db = makeDb();
    service = new AuthService(makePrisma(db), makeJwtService());
  });

  it('throws UnauthorizedException when user not found', async () => {
    db.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'ghost@example.com', password: 'P@ssword1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when user is inactive', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'uid',
      email: 'test@example.com',
      displayName: 'Test',
      passwordHash: '$argon2id$some$hash',
      role: 'USER',
      isActive: false,
      deletedAt: null,
    });

    await expect(
      service.login({ email: 'test@example.com', password: 'P@ssword1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when user is soft-deleted', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'uid',
      email: 'test@example.com',
      displayName: 'Test',
      passwordHash: '$argon2id$some$hash',
      role: 'USER',
      isActive: true,
      deletedAt: new Date(),
    });

    await expect(
      service.login({ email: 'test@example.com', password: 'P@ssword1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns the same error message for user-not-found and wrong-password (no enum leak)', async () => {
    const notFoundError = await service
      .login({ email: 'nobody@example.com', password: 'P@ssword1' })
      .catch((e: UnauthorizedException) => e);

    db.user.findUnique.mockResolvedValue({
      id: 'uid',
      email: 'test@example.com',
      displayName: 'Test',
      passwordHash: '$argon2id$vvvvvvvvv', // won't verify
      role: 'USER',
      isActive: true,
      deletedAt: null,
    });

    const wrongPassError = await service
      .login({ email: 'test@example.com', password: 'WrongPassword' })
      .catch((e: UnauthorizedException) => e);

    expect((notFoundError as UnauthorizedException).message).toBe(
      (wrongPassError as UnauthorizedException).message,
    );
  });
});

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------

describe('AuthService.logout', () => {
  let db: ReturnType<typeof makeDb>;
  let service: AuthService;

  beforeEach(() => {
    db = makeDb();
    service = new AuthService(makePrisma(db), makeJwtService());
  });

  const principal = {
    userId: 'user-abc',
    email: 'u@example.com',
    displayName: 'U',
    role: 'USER' as const,
  };

  it('returns revoked:true when token not found (idempotent)', async () => {
    db.refreshToken.findUnique.mockResolvedValue(null);
    const result = await service.logout('any-raw-token', principal);
    expect(result).toEqual({ revoked: true });
  });

  it('silently succeeds when token belongs to a different user', async () => {
    db.refreshToken.findUnique.mockResolvedValue({
      id: 'tok-1',
      userId: 'different-user-id',
      family: 'fam-1',
    });

    const result = await service.logout('raw-token', principal);
    expect(result).toEqual({ revoked: true });
    // Must not revoke family that belongs to another user
    expect(db.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('revokes entire family when token belongs to the principal', async () => {
    db.refreshToken.findUnique.mockResolvedValue({
      id: 'tok-1',
      userId: principal.userId,
      family: 'fam-xyz',
    });
    db.refreshToken.updateMany.mockResolvedValue({ count: 2 });

    const result = await service.logout('raw-token', principal);
    expect(result).toEqual({ revoked: true });
    expect(db.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ family: 'fam-xyz' }),
      }),
    );
  });
});
