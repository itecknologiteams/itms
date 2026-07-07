import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AllExceptionsFilter } from '../errors/all-exceptions.filter';
import { setupOpenApi } from './openapi';

export interface BootstrapOptions {
  serviceName: string;
  /** Public API version prefix, e.g. mounts routes under /v1. */
  apiVersion?: string;
  enableOpenApi?: boolean;
}

/**
 * Applies the uniform cross-cutting setup every service shares
 * (docs/architecture.md §5): pino logging, global validation, the standard
 * error envelope, URI versioning, and OpenAPI docs.
 */
export function applyCommonSetup(app: INestApplication, opts: BootstrapOptions): void {
  app.useLogger(app.get(Logger));
  app.flushLogs();

  // Every route is already authorized by JWT (per-route @Roles/@Public), not
  // by origin, so allowing any origin is safe — and necessary, since the
  // mobile apps' web build (and any future browser client that isn't
  // proxied same-origin like the admin panel's Next.js rewrites are) calls
  // these services directly from the browser. No cookies are used for auth
  // (Bearer tokens only), so this doesn't need `credentials: true`.
  app.enableCors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Trace-Id'],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: opts.apiVersion ?? '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  if (opts.enableOpenApi ?? true) {
    setupOpenApi(app, opts.serviceName);
  }
}
