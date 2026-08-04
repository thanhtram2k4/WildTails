import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import type { Principal } from '@wildtails/contracts';
import { JWT_SECRET_FALLBACK } from './auth.constants';

/**
 * Validates the JWT from the Authorization: Bearer header.
 * Returns a Principal — the canonical authenticated user context.
 * Never trusts role, userId, or email from any other source.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env['JWT_SECRET'] ?? JWT_SECRET_FALLBACK,
    });
  }

  validate(payload: Record<string, unknown>): Principal {
    if (
      typeof payload['userId'] !== 'string' ||
      typeof payload['email'] !== 'string' ||
      typeof payload['role'] !== 'string'
    ) {
      throw new UnauthorizedException();
    }

    const role = payload['role'];
    if (role !== 'USER' && role !== 'ADMIN') {
      throw new UnauthorizedException();
    }

    return {
      userId: payload['userId'],
      email: payload['email'],
      displayName: typeof payload['displayName'] === 'string' ? payload['displayName'] : '',
      role,
    };
  }
}
