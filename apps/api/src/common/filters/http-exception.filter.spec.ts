import { describe, it, expect } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

// Minimal mock for ArgumentsHost
function makeHost(mockResponse: { status: (code: number) => { json: (body: unknown) => void } }) {
  return {
    switchToHttp: () => ({
      getResponse: () => mockResponse,
      getRequest: () => ({ method: 'GET', url: '/test' }),
    }),
  } as unknown as import('@nestjs/common').ArgumentsHost;
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  function capture(exception: unknown) {
    let capturedStatus = 0;
    let capturedBody: unknown = null;

    const mockResponse = {
      status: (code: number) => {
        capturedStatus = code;
        return {
          json: (body: unknown) => {
            capturedBody = body;
          },
        };
      },
    };

    filter.catch(exception, makeHost(mockResponse));
    return {
      status: capturedStatus,
      body: capturedBody as { success: boolean; error: { code: string; message: string } },
    };
  }

  it('maps 401 → UNAUTHORIZED', () => {
    const { status, body } = capture(new UnauthorizedException('Bad creds'));
    expect(status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('maps 403 → FORBIDDEN', () => {
    const { status, body } = capture(new ForbiddenException());
    expect(status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('maps 404 → NOT_FOUND', () => {
    const { status, body } = capture(new NotFoundException());
    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('maps 409 → CONFLICT', () => {
    const { status, body } = capture(new ConflictException());
    expect(status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('maps 400 → VALIDATION_ERROR', () => {
    const { status, body } = capture(new BadRequestException('bad input'));
    expect(status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('maps unknown error → 500 INTERNAL_ERROR without leaking stack', () => {
    const { status, body } = capture(new Error('secret internal'));
    expect(status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(body)).not.toContain('secret internal');
  });

  it('preserves details from ZodValidationPipe structured payload', () => {
    const payload = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ path: ['email'], message: 'Invalid email', code: 'invalid_string' }],
    };
    const { body } = capture(new BadRequestException(payload));
    const b = body as unknown as {
      success: boolean;
      error: { code: string; message: string; details: unknown[] };
    };
    expect(b.error.message).toBe('Validation failed');
    expect(Array.isArray(b.error.details)).toBe(true);
  });

  it('maps 500 HttpException → INTERNAL_ERROR', () => {
    const { status, body } = capture(
      new HttpException('Something broke', HttpStatus.INTERNAL_SERVER_ERROR),
    );
    expect(status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
