import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GpsLog } from '../entities/gps-log.entity';
import { NormalizedPing } from '../ingest/ping';

/**
 * Buffers GPS pings and flushes them to TimescaleDB in batches to sustain the
 * high write rate (docs/specs.md N-01). Flushes on size or interval; drains on
 * shutdown so nothing in the buffer is lost on a clean stop.
 */
@Injectable()
export class HistoryBufferService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HistoryBufferService.name);
  private buffer: GpsLog[] = [];
  private timer?: NodeJS.Timeout;
  private readonly flushIntervalMs = 2000;
  private readonly maxBatch = 500;

  constructor(@InjectRepository(GpsLog) private readonly repo: Repository<GpsLog>) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.flush(), this.flushIntervalMs);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.flush();
  }

  add(ping: NormalizedPing): void {
    this.buffer.push(
      this.repo.create({
        time: new Date(ping.ts),
        vehicleId: ping.vehicleId,
        lat: ping.lat,
        lon: ping.lon,
        speedKmh: ping.speedKmh,
        heading: ping.heading,
        ignition: ping.ignition,
        batteryPct: ping.batteryPct,
        source: ping.source,
      }),
    );
    if (this.buffer.length >= this.maxBatch) void this.flush();
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer;
    this.buffer = [];
    try {
      // orIgnore: a duplicate (vehicle_id, time) is harmless — skip it.
      await this.repo.createQueryBuilder().insert().values(batch).orIgnore().execute();
    } catch (err) {
      this.logger.error(`GPS history flush failed (${batch.length} rows): ${(err as Error).message}`);
    }
  }
}
