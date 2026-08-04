import { Controller, Post, Body, HttpCode, HttpStatus, UsePipes } from '@nestjs/common';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshRequestSchema,
  LogoutRequestSchema,
  type RegisterRequest,
  type LoginRequest,
  type RefreshRequest,
  type LogoutRequest,
  type Principal,
} from '@wildtails/contracts';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   * Public. Returns 201 with LoginResponse (access + refresh tokens).
   * Role is server-assigned — never accepted from client.
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(RegisterRequestSchema))
  async register(@Body() dto: RegisterRequest) {
    const data = await this.authService.register(dto);
    return { success: true, data };
  }

  /**
   * POST /auth/login
   * Public. Returns 200 with LoginResponse.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(LoginRequestSchema))
  async login(@Body() dto: LoginRequest) {
    const data = await this.authService.login(dto);
    return { success: true, data };
  }

  /**
   * POST /auth/refresh
   * Public (caller presents a refresh token, not an access token).
   * Atomically rotates the refresh token.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(RefreshRequestSchema))
  async refresh(@Body() dto: RefreshRequest) {
    const data = await this.authService.refresh(dto);
    return { success: true, data };
  }

  /**
   * POST /auth/logout
   * Requires valid JWT (D13). Revokes the entire refresh token family.
   * Idempotent — succeeds even when the token is already revoked.
   * Do NOT log the refreshToken value.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(LogoutRequestSchema))
  async logout(@Body() dto: LogoutRequest, @CurrentUser() user: Principal) {
    const data = await this.authService.logout(dto.refreshToken, user);
    return { success: true, data };
  }
}
