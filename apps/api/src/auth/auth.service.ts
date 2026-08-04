import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import {
  ARGON2_OPTIONS,
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  REFRESH_TOKEN_EXPIRES_IN_DAYS,
} from './auth.constants';
import type {
  RegisterRequest,
  LoginRequest,
  RefreshRequest,
  LoginResponse,
  Principal,
} from '@wildtails/contracts';

/** SHA-256 hex digest of the raw token. Never store raw tokens. */
function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Add days to a date without external dependencies. */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // ---------------------------------------------------------------------------
  // register
  // ---------------------------------------------------------------------------

  async register(dto: RegisterRequest): Promise<LoginResponse> {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await hash(dto.password, ARGON2_OPTIONS);

    const user = await this.prisma.db.user.create({
      data: {
        email,
        passwordHash,
        displayName: dto.displayName,
      },
      select: { id: true, email: true, displayName: true, role: true },
    });

    return this.issueTokenPair(user.id, user.email, user.displayName, user.role);
  }

  // ---------------------------------------------------------------------------
  // login
  // ---------------------------------------------------------------------------

  async login(dto: LoginRequest): Promise<LoginResponse> {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        passwordHash: true,
        role: true,
        isActive: true,
        deletedAt: true,
      },
    });

    // Unified message — prevent email enumeration
    const credentialsError = new UnauthorizedException('Invalid credentials');

    if (!user || !user.isActive || user.deletedAt !== null) {
      throw credentialsError;
    }

    const valid = await verify(user.passwordHash, dto.password);
    if (!valid) {
      throw credentialsError;
    }

    return this.issueTokenPair(user.id, user.email, user.displayName, user.role);
  }

  // ---------------------------------------------------------------------------
  // refresh — atomic rotation with replay detection
  // ---------------------------------------------------------------------------

  async refresh(dto: RefreshRequest): Promise<LoginResponse> {
    const tokenHash = sha256(dto.refreshToken);
    const now = new Date();

    type TransactionOutcome =
      | { outcome: 'INVALID' }
      | { outcome: 'REPLAY' }
      | { outcome: 'LOST_RACE' }
      | { outcome: 'SUCCESS'; userId: string; newRawToken: string };

    let result: TransactionOutcome;

    try {
      result = await this.prisma.db.$transaction(async (tx): Promise<TransactionOutcome> => {
        const existing = await tx.refreshToken.findUnique({
          where: { tokenHash },
          select: {
            id: true,
            userId: true,
            revokedAt: true,
            expiresAt: true,
            replacedByTokenId: true,
            family: true,
          },
        });

        if (!existing) return { outcome: 'INVALID' };
        if (existing.revokedAt !== null) return { outcome: 'INVALID' };
        if (existing.expiresAt < now) return { outcome: 'INVALID' };

        // Replay detection: if the token was ALREADY rotated before this
        // request arrived, this is a genuine replay of a consumed token.
        // Revoke the entire family and return REPLAY (commits before 401).
        if (existing.replacedByTokenId !== null) {
          await tx.refreshToken.updateMany({
            where: { family: existing.family },
            data: { revokedAt: now },
          });
          return { outcome: 'REPLAY' };
        }

        // Normal rotation — conditional update guards against concurrent races.
        // The WHERE clause (replacedByTokenId IS NULL) ensures only one
        // concurrent request succeeds. The loser sees count=0.
        const newRawToken = randomBytes(32).toString('base64url');
        const newTokenHash = sha256(newRawToken);
        const newTokenId = randomUUID();

        const updated = await tx.refreshToken.updateMany({
          where: {
            id: existing.id,
            revokedAt: null,
            replacedByTokenId: null,
          },
          data: { replacedByTokenId: newTokenId },
        });

        if (updated.count === 0) {
          // Lost the race — another concurrent request rotated first.
          // Do NOT revoke the family: this is a race, not a confirmed replay.
          return { outcome: 'LOST_RACE' };
        }

        // Rotation succeeded — create the successor token.
        await tx.refreshToken.create({
          data: {
            id: newTokenId,
            userId: existing.userId,
            tokenHash: newTokenHash,
            family: existing.family,
            expiresAt: addDays(now, REFRESH_TOKEN_EXPIRES_IN_DAYS),
          },
        });

        return { outcome: 'SUCCESS', userId: existing.userId, newRawToken };
      });
    } catch (err: unknown) {
      // Prisma P2034 — serialization failure (concurrent transaction conflict)
      if (err instanceof Error && 'code' in err && (err as { code?: string }).code === 'P2034') {
        throw new UnauthorizedException('Token rotation conflict');
      }
      this.logger.error('Unexpected error during token refresh', err);
      throw new InternalServerErrorException();
    }

    if (
      result.outcome === 'INVALID' ||
      result.outcome === 'REPLAY' ||
      result.outcome === 'LOST_RACE'
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.db.user.findUniqueOrThrow({
      where: { id: result.userId },
      select: { id: true, email: true, displayName: true, role: true },
    });

    const accessToken = this.signAccessToken(user.id, user.email, user.displayName, user.role);

    return {
      accessToken,
      refreshToken: result.newRawToken,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    };
  }

  // ---------------------------------------------------------------------------
  // logout — idempotent; revokes entire token family
  // ---------------------------------------------------------------------------

  async logout(rawRefreshToken: string, principal: Principal): Promise<{ revoked: boolean }> {
    const tokenHash = sha256(rawRefreshToken);
    const now = new Date();

    const existing = await this.prisma.db.refreshToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, family: true },
    });

    if (!existing) {
      // Idempotent — token already gone or never existed
      return { revoked: true };
    }

    // Ownership check — must belong to the authenticated user
    if (existing.userId !== principal.userId) {
      // Silently succeed to prevent token probing
      return { revoked: true };
    }

    await this.prisma.db.refreshToken.updateMany({
      where: { family: existing.family },
      data: { revokedAt: now },
    });

    return { revoked: true };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async issueTokenPair(
    userId: string,
    email: string,
    displayName: string,
    role: string,
  ): Promise<LoginResponse> {
    const rawRefreshToken = randomBytes(32).toString('base64url');
    const tokenHash = sha256(rawRefreshToken);
    const family = randomUUID();
    const now = new Date();

    await this.prisma.db.refreshToken.create({
      data: {
        userId,
        tokenHash,
        family,
        expiresAt: addDays(now, REFRESH_TOKEN_EXPIRES_IN_DAYS),
      },
    });

    const accessToken = this.signAccessToken(userId, email, displayName, role);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    };
  }

  private signAccessToken(
    userId: string,
    email: string,
    displayName: string,
    role: string,
  ): string {
    return this.jwtService.sign({ userId, email, displayName, role });
  }
}
