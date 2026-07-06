import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { DISPATCH_CONFIG, DispatchConfig } from '../config/configuration';

/**
 * Port for the atomic accept claim (docs/specs.md §5.4). The first driver to claim
 * a ride wins; all others lose. Behind an interface so the matching logic is
 * testable without Redis.
 */
export interface ClaimStore {
  /** Atomically claim a ride for a driver. Returns true only for the winner. */
  tryClaim(rideId: string, driverId: string, ttlMs: number): Promise<boolean>;
  /** Which driver (if any) currently holds the claim. */
  holder(rideId: string): Promise<string | null>;
}

export const CLAIM_STORE = Symbol('CLAIM_STORE');

@Injectable()
export class RedisClaimStore implements ClaimStore, OnModuleInit, OnModuleDestroy {
  private redis!: Redis;

  constructor(@Inject(DISPATCH_CONFIG) private readonly config: DispatchConfig) {}

  onModuleInit(): void {
    this.redis = new Redis(this.config.redisUrl, { maxRetriesPerRequest: 3 });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit().catch(() => undefined);
  }

  async tryClaim(rideId: string, driverId: string, ttlMs: number): Promise<boolean> {
    // SET key value NX PX ttl — succeeds only if the key does not yet exist.
    const res = await this.redis.set(this.key(rideId), driverId, 'PX', ttlMs, 'NX');
    return res === 'OK';
  }

  async holder(rideId: string): Promise<string | null> {
    return this.redis.get(this.key(rideId));
  }

  private key(rideId: string): string {
    return `ride:${rideId}:claim`;
  }
}
