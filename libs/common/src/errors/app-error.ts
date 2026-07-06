import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Domain error carrying a stable machine-readable `code` in addition to an HTTP status.
 * The AllExceptionsFilter renders these into the standard error envelope
 * defined in docs/api-design.md §1.
 */
export class AppError extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }
}

/** 409 — request conflicts with current state (e.g. ride already assigned). */
export class ConflictError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, HttpStatus.CONFLICT, details);
  }
}

/** 422 — request is well-formed but violates a domain rule. */
export class DomainRuleError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
}

/** 404 — entity not found. */
export class NotFoundError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, HttpStatus.NOT_FOUND, details);
  }
}

/** 401 — authentication missing or invalid. */
export class UnauthorizedError extends AppError {
  constructor(code = 'UNAUTHORIZED', message = 'Authentication required') {
    super(code, message, HttpStatus.UNAUTHORIZED);
  }
}

/** 403 — authenticated but not permitted. */
export class ForbiddenError extends AppError {
  constructor(code = 'FORBIDDEN', message = 'Not permitted') {
    super(code, message, HttpStatus.FORBIDDEN);
  }
}

/** 429 — rate limit exceeded. */
export class RateLimitError extends AppError {
  constructor(code = 'RATE_LIMITED', message = 'Too many requests') {
    super(code, message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
