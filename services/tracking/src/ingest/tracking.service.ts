import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createEnvelope, EventBusService, EventNames } from '@itms/events';
import { Repository } from 'typeorm';
import { TRACKING_CONFIG, TrackingConfig } from '../config/configuration';
import { TrackerHealth, TrackerStatus } from '../entities/tracker-health.entity';
import { HistoryBufferService } from '../history/history-buffer.service';
import { LIVE_LOCATION_STORE, LiveLocationStore } from '../live/live-location.store';
import { NormalizedPing } from './ping';
import { SamplingThrottle } from './sampling-throttle';

/**
 * Central ingest pipeline for a single normalized ping (docs/specs.md §9):
 *   live layer (Redis) → history buffer (Timescale) → health touch →
 *   sampled vehicle.location.updated publish.
 *
 * Location samples are published directly (not via the outbox): they are
 * high-frequency and transient — losing one is immaterial, and consumers only
 * ever need the latest (architecture.md §2). Durable state uses the outbox.
 */
@Injectable()
export class TrackingService {
  private readonly throttle: SamplingThrottle;

  constructor(
    @Inject(TRACKING_CONFIG) private readonly config: TrackingConfig,
    @Inject(LIVE_LOCATION_STORE) private readonly live: LiveLocationStore,
    private readonly history: HistoryBufferService,
    private readonly bus: EventBusService,
    @InjectRepository(TrackerHealth) private readonly health: Repository<TrackerHealth>,
  ) {
    this.throttle = new SamplingThrottle(this.config.sampling.publishIntervalSeconds * 1000);
  }

  async ingest(ping: NormalizedPing, deviceId?: string): Promise<void> {
    await this.live.upsert(ping);
    this.history.add(ping);
    await this.touchHealth(ping.vehicleId, deviceId ?? null, ping.ts);

    if (this.throttle.shouldPublish(ping.vehicleId, ping.ts)) {
      await this.bus.publish(
        createEnvelope({
          eventName: EventNames.VehicleLocationUpdated,
          producer: 'tracking',
          payload: {
            vehicle_id: ping.vehicleId,
            lat: ping.lat,
            lon: ping.lon,
            speed: ping.speedKmh,
            at: new Date(ping.ts).toISOString(),
          },
        }),
      );
    }
  }

  private async touchHealth(vehicleId: string, deviceId: string | null, ts: number): Promise<void> {
    await this.health.upsert(
      { vehicleId, deviceId, lastPingAt: new Date(ts), status: TrackerStatus.Ok },
      ['vehicleId'],
    );
  }
}
