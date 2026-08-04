import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Principal } from '@wildtails/contracts';

/**
 * Extracts the authenticated Principal from the request.
 * The Principal is populated by JwtStrategy after validating the JWT.
 * Never constructed from client-supplied data.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Principal => {
    const request = ctx.switchToHttp().getRequest<Request & { user: Principal }>();
    return request.user;
  },
);
