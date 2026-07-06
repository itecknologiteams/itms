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
