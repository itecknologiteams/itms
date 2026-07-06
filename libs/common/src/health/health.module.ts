import { DynamicModule, Global, Inject, Injectable, Module } from '@nestjs/common';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

export interface ReadinessCheck {
  name: string;
  check: () => Promise<boolean>;
}

export const READINESS_CHECKS = Symbol('READINESS_CHECKS');
export const SERVICE_NAME = Symbol('SERVICE_NAME');

@Injectable()
export class HealthService {
  private readonly startedAt = process.hrtime.bigint();

  constructor(
    @Inject(SERVICE_NAME) private readonly serviceName: string,
    @Inject(READINESS_CHECKS) private readonly checks: ReadinessCheck[],
  ) {}

  liveness() {
    const uptimeSeconds = Number(process.hrtime.bigint() - this.startedAt) / 1e9;
    return { status: 'ok', service: this.serviceName, uptime_s: Math.round(uptimeSeconds) };
  }

  async readiness() {
    const results = await Promise.all(
      this.checks.map(async (c) => {
        try {
          return { name: c.name, ok: await c.check() };
        } catch {
          return { name: c.name, ok: false };
        }
      }),
    );
    const ok = results.every((r) => r.ok);
    return { status: ok ? 'ready' : 'not_ready', checks: results };
  }
}

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Liveness — process is up. Never touches dependencies. */
  @Get('health')
  liveness() {
    return this.health.liveness();
  }

  /** Readiness — all declared dependencies (DB, broker, cache) are reachable. */
  @Get('ready')
  async readiness() {
    return this.health.readiness();
  }
}

/**
 * Uniform health endpoints for every service (docs/architecture.md §5).
 * Services pass their readiness checks (DB ping, broker, etc.).
 */
@Global()
@Module({})
export class HealthModule {
  static forRoot(serviceName: string, checks: ReadinessCheck[] = []): DynamicModule {
    return {
      module: HealthModule,
      controllers: [HealthController],
      providers: [
        HealthService,
        { provide: SERVICE_NAME, useValue: serviceName },
        { provide: READINESS_CHECKS, useValue: checks },
      ],
      exports: [HealthService],
    };
  }
}
