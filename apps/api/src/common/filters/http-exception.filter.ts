import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorCode } from '@wildtails/contracts';

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
};

function resolveCode(status: number): ApiErrorCode {
  if (status in STATUS_TO_CODE) {
    return STATUS_TO_CODE[status]!;
  }
  if (status >= 500) {
    return 'INTERNAL_ERROR';
  }
  return 'VALIDATION_ERROR';
}

/**
 * Global exception filter.
 * Maps every thrown exception to ApiErrorEnvelope.
 * Stack traces and internal details are never forwarded to the client.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ApiErrorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = resolveCode(status);

      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'code' in exceptionResponse &&
        'message' in exceptionResponse
      ) {
        // Structured payload from ZodValidationPipe or our own throws
        const structured = exceptionResponse as {
          code?: string;
          message?: string;
          details?: unknown;
        };
        // Trust our own code label when it matches an ApiErrorCode
        if (typeof structured.code === 'string') {
          code = resolveCode(status);
        }
        if (typeof structured.message === 'string') {
          message = structured.message;
        }
        if ('details' in structured) {
          details = structured.details;
        }
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const raw = exceptionResponse as { message?: string | string[] };
        message = Array.isArray(raw.message) ? raw.message.join('; ') : (raw.message ?? message);
      }
    } else {
      // Unknown / non-HTTP exception — log internally, return generic 500
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body = {
      success: false as const,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    };

    response.status(status).json(body);
  }
}
