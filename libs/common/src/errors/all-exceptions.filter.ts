import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    trace_id: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Renders every thrown error into the single error envelope used across all services
 * (docs/api-design.md §1). Unknown errors become 500 INTERNAL and are logged with the
 * request's trace id; their internal message is never leaked to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();
    const traceId = (request.headers['x-trace-id'] as string) || request.id || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        code = this.defaultCodeFor(status);
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        // AppError shape: { code, message, details }
        code = (body.code as string) ?? this.defaultCodeFor(status);
        // Nest validation errors put an array under `message`.
        if (Array.isArray(body.message)) {
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
          details = { errors: body.message };
        } else {
          message = (body.message as string) ?? message;
        }
        details = (body.details as Record<string, unknown>) ?? details;
      }
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${traceId}] ${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const envelope: ErrorEnvelope = {
      error: { code, message, trace_id: traceId, ...(details ? { details } : {}) },
    };
    response.status(status).json(envelope);
  }

  private defaultCodeFor(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMITED',
    };
    return map[status] ?? 'INTERNAL_ERROR';
  }
}
