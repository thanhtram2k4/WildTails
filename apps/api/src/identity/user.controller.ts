import { Controller, Get, Patch, Param, Body, UsePipes } from '@nestjs/common';
import {
  UpdateUserProfileRequestSchema,
  type UpdateUserProfileRequest,
  type Principal,
} from '@wildtails/contracts';
import { UserService } from './user.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

/**
 * IMPORTANT: /users/me routes are declared BEFORE /users/:id to prevent
 * Express from matching the literal string "me" as a UUID parameter.
 */
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * GET /users/me
   * Returns the full profile (including email) for the authenticated user.
   * Owner is derived from the validated JWT — not from the request body.
   */
  @Get('me')
  async getMe(@CurrentUser() user: Principal) {
    const data = await this.userService.getProfile(user.userId);
    return { success: true, data };
  }

  /**
   * PATCH /users/me
   * Updates the authenticated user's own profile.
   * Role and ownership are server-enforced — not client-supplied.
   */
  @Patch('me')
  @UsePipes(new ZodValidationPipe(UpdateUserProfileRequestSchema))
  async updateMe(@CurrentUser() user: Principal, @Body() dto: UpdateUserProfileRequest) {
    const data = await this.userService.updateProfile(user.userId, dto);
    return { success: true, data };
  }

  /**
   * GET /users/me/planets
   * Returns all planets the authenticated user is currently a member of.
   */
  @Get('me/planets')
  async getMyPlanets(@CurrentUser() user: Principal) {
    const data = await this.userService.getUserPlanets(user.userId);
    return { success: true, data };
  }

  /**
   * GET /users/:id
   * Returns a public profile — email is omitted.
   * Soft-deleted users return 404.
   * This route MUST remain below /users/me and /users/me/planets.
   */
  @Get(':id')
  async getPublicProfile(@Param('id') id: string) {
    const data = await this.userService.getPublicProfile(id);
    return { success: true, data };
  }
}
