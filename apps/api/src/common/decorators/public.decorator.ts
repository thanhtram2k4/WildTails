import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'IS_PUBLIC';

/**
 * Marks a route as public — bypasses the global JwtAuthGuard.
 * Apply to routes that do not require authentication (register, login, refresh, health).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
