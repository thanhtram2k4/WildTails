import { z } from 'zod';

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  /** Raw password — never log this field. */
  password: z.string().min(8),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  /** Access token lifetime in seconds. */
  expiresIn: z.number().int().positive(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RefreshRequestSchema = z.object({
  /** Refresh token — never log this field. */
  refreshToken: z.string(),
});

export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  /** Raw password — never log this field. */
  password: z.string().min(8),
  displayName: z.string().min(1).max(50),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
