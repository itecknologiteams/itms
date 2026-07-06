import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { TRACKING_CONFIG, TrackingConfig } from '../config/configuration';
import { NormalizedPing } from '../ingest/ping';

export interface LiveLocation {
  vehicleId: string;
  lat: number;
  lon: number;
  speedKmh: number;
  heading: number;
  ts: number;
}

/** Port for the live-location layer, so the pipeline can be unit-tested. */
export interface LiveLocationStore {
  upsert(ping: NormalizedPing): Promise<void>;
  get(vehicleId: string): Promise<LiveLocation | null>;
  nearby(lat: number, lon: number, radiusMeters: number): Promise<string[]>;
}

export const LIVE_LOCATION_STORE = Symbol('LIVE_LOCATION_STORE');

/**
 * Redis-backed live layer (docs/architecture.md §4): GEO set for proximity queries
 * plus a per-vehicle hash for the latest fix. Sub-millisecond reads for dispatch
 * and the admin map; NOT a system of record (that's TimescaleDB).
 */
@Injectable()
export class RedisLiveLocationStore
  implements LiveLocationStore, OnModuleInit, OnModuleDestroy
{
  private redis!: Redis;
  private static readonly GEO_KEY = 'vehicles:geo';

  constructor(@Inject(TRACKING_CONFIG) private readonly config: TrackingConfig) {}

  onModuleInit(): void {
    this.redis = new Redis(this.config.redisUrl, { lazyConnect: false, maxRetriesPerRequest: 3 });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit().catch(() => undefined);
  }

  async upsert(ping: NormalizedPing): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.geoadd(RedisLiveLocationStore.GEO_KEY, ping.lon, ping.lat, ping.vehicleId);
    pipeline.hset(`vehicle:${ping.vehicleId}`, {
      lat: ping.lat,
      lon: ping.lon,
      speed: ping.speedKmh,
      heading: ping.heading,
      ts: ping.ts,
    });
    // Expire the hash if the vehicle goes silent for 10 minutes.
    pipeline.expire(`vehicle:${ping.vehicleId}`, 600);
    await pipeline.exec();
  }

  async get(vehicleId: string): Promise<LiveLocation | null> {
    const h = await this.redis.hgetall(`vehicle:${vehicleId}`);
    if (!h || !h.lat) return null;
    return {
      vehicleId,
      lat: Number(h.lat),
      lon: Number(h.lon),
      speedKmh: Number(h.speed),
      heading: Number(h.heading),
      ts: Number(h.ts),
    };
  }

  async nearby(lat: number, lon: number, radiusMeters: number): Promise<string[]> {
    const res = (await this.redis.geosearch(
      RedisLiveLocationStore.GEO_KEY,
      'FROMLONLAT',
      lon,
      lat,
      'BYRADIUS',
      radiusMeters,
      'm',
      'ASC',
    )) as string[];
    return res;
  }
}
