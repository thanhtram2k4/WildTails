import { SetMetadata } from '@nestjs/common';
import type { Principal } from '@wildtails/contracts';

export const ROLES_KEY = 'ROLES';

/**
 * Restricts a route to users with the specified role.
 * The RolesGuard reads this metadata to enforce platform-level RBAC.
 * The client must never be trusted to supply the role — it is always
 * read from the validated JWT payload (Principal).
 */
export const Roles = (...roles: Principal['role'][]) => SetMetadata(ROLES_KEY, roles);
