import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createEnvelope, EventBusService, EventNames } from '@itms/events';
import { LessThan, Not, Repository } from 'typeorm';
import { TRACKING_CONFIG, TrackingConfig } from '../config/configuration';
import { TrackerHealth, TrackerStatus } from '../entities/tracker-health.entity';

/**
 * Periodically scans tracker health and transitions vehicles to stale/dead when
 * pings stop (docs/specs.md §9). A vehicle going stale is excluded from dispatch
 * (Dispatch consumes tracker.stale); dead trackers raise an admin alert.
 */
@Injectable()
export class TrackerHealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrackerHealthService.name);
  private timer?: NodeJS.Timeout;
  private readonly scanIntervalMs = 15_000;

  constructor(
    @Inject(TRACKING_CONFIG) private readonly config: TrackingConfig,
    @InjectRepository(TrackerHealth) private readonly health: Repository<TrackerHealth>,
    private readonly bus: EventBusService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.scan(), this.scanIntervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async scan(): Promise<void> {
    const now = Date.now();
    const staleCutoff = new Date(now - this.config.health.staleSeconds * 1000);
    const deadCutoff = new Date(now - this.config.health.deadSeconds * 1000);

    try {
      // OK/stale → dead
      await this.health.update(
        { lastPingAt: LessThan(deadCutoff), status: Not(TrackerStatus.Dead) },
        { status: TrackerStatus.Dead },
      );

      // OK → stale (between stale and dead cutoffs); emit tracker.stale for each.
      const newlyStale = await this.health.find({
        where: { lastPingAt: LessThan(staleCutoff), status: TrackerStatus.Ok },
      });
      for (const t of newlyStale) {
        t.status = TrackerStatus.Stale;
        await this.health.save(t);
        await this.bus.publish(
          createEnvelope({
            eventName: EventNames.TrackerStale,
            producer: 'tracking',
            payload: { vehicle_id: t.vehicleId, last_ping_at: t.lastPingAt.toISOString() },
          }),
        );
      }
      if (newlyStale.length) this.logger.warn(`${newlyStale.length} tracker(s) went stale`);
    } catch (err) {
      this.logger.error(`Health scan failed: ${(err as Error).message}`);
    }
  }
}
