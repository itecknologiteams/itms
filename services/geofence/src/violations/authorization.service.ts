import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { MovementPass } from '../entities/movement-pass.entity';
import { GEOFENCE_CONFIG, GeofenceConfig } from '../config/configuration';

/**
 * Decides whether a vehicle's out-of-zone position is authorized (docs/specs.md §6.4):
 *   1. currently on an active ride, or
 *   2. within the post-ride return window, or
 *   3. covered by an admin movement pass.
 *
 * Active-ride and last-ended state are tracked in-memory from ride.* events
 * (v1; Redis-backed in production). Movement passes are read from the DB.
 */
@Injectable()
export class AuthorizationService {
  private readonly onActiveRide = new Set<string>();
  private readonly lastRideEndedAt = new Map<string, number>();

  constructor(
    @Inject(GEOFENCE_CONFIG) private readonly config: GeofenceConfig,
    @InjectRepository(MovementPass) private readonly passRepo: Repository<MovementPass>,
  ) {}

  markRideActive(vehicleId: string): void {
    this.onActiveRide.add(vehicleId);
  }

  markRideEnded(vehicleId: string, at: number): void {
    this.onActiveRide.delete(vehicleId);
    this.lastRideEndedAt.set(vehicleId, at);
  }

  async isAuthorized(vehicleId: string, now: number): Promise<boolean> {
    if (this.onActiveRide.has(vehicleId)) return true;

    const endedAt = this.lastRideEndedAt.get(vehicleId);
    if (endedAt && now - endedAt <= this.config.hysteresis.returnWindowMinutes * 60_000) {
      return true;
    }

    return this.hasActivePass(vehicleId, now);
  }

  private async hasActivePass(vehicleId: string, now: number): Promise<boolean> {
    const at = new Date(now);
    const count = await this.passRepo.count({
      where: { vehicleId, fromTs: LessThanOrEqual(at), toTs: MoreThanOrEqual(at) },
    });
    return count > 0;
  }
}
