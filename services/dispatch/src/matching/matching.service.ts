import { Inject, Injectable, Logger } from '@nestjs/common';
import { LatLon } from '@itms/common';
import { createEnvelope, EventBusService, EventNames } from '@itms/events';
import { DISPATCH_CONFIG, DispatchConfig } from '../config/configuration';
import { RankedZone, rankZonesByDistance, zonesForRound } from '../domain/zone-selection';
import { ExpansionParams, shouldContinue } from '../domain/expansion';
import { DriverRegistry } from '../registries/driver-registry.service';
import { ZoneCache } from '../registries/zone-cache.service';
import { CLAIM_STORE, ClaimStore } from '../claim/claim.store';

interface ActiveMatch {
  rideId: string;
  ranked: RankedZone[];
  round: number;
  startedAt: number;
  offered: Set<string>;
  timer?: NodeJS.Timeout;
  resolved: boolean;
}

export interface ClaimOutcome {
  won: boolean;
  vehicleId?: string;
  zoneId?: string;
}

/**
 * Runs the 3-nearest-zone broadcast with one-zone-per-round expansion and the
 * atomic first-accept-wins claim (docs/specs.md §5). Round timers are in-process
 * (v1 single-replica dispatch); production coordinates rounds via Redis so any
 * replica can drive them — documented limitation.
 */
@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private readonly active = new Map<string, ActiveMatch>();

  constructor(
    @Inject(DISPATCH_CONFIG) private readonly config: DispatchConfig,
    @Inject(CLAIM_STORE) private readonly claims: ClaimStore,
    private readonly zones: ZoneCache,
    private readonly drivers: DriverRegistry,
    private readonly bus: EventBusService,
  ) {}

  private params(availableZoneCount: number): ExpansionParams {
    const m = this.config.matching;
    return {
      initialZones: m.initialZones,
      maxZones: m.maxZones,
      offerMs: m.offerSeconds * 1000,
      maxTotalWaitMs: m.maxTotalWaitSeconds * 1000,
      availableZoneCount,
    };
  }

  /** Begin matching for a newly requested ride. */
  startMatching(rideId: string, pickup: LatLon, now: number): void {
    if (this.active.has(rideId)) return; // idempotent (re-delivered event)
    const ranked = rankZonesByDistance(pickup, this.zones.all());
    if (ranked.length === 0) {
      void this.exhaust(rideId);
      return;
    }
    const match: ActiveMatch = { rideId, ranked, round: 0, startedAt: now, offered: new Set(), resolved: false };
    this.active.set(rideId, match);
    this.runRound(match);
  }

  private runRound(match: ActiveMatch): void {
    match.round += 1;
    const zoneIds = zonesForRound(
      match.ranked,
      match.round,
      this.config.matching.initialZones,
      this.config.matching.maxZones,
    );
    const eligible = this.drivers.eligibleInZones(new Set(zoneIds));
    eligible.forEach((d) => match.offered.add(d.driverId));

    void this.bus.publish(
      createEnvelope({
        eventName: EventNames.DispatchOfferBroadcast,
        producer: 'dispatch',
        payload: {
          ride_id: match.rideId,
          round: match.round,
          zone_ids: zoneIds,
          offered_driver_ids: eligible.map((d) => d.driverId),
        },
      }),
    );
    this.logger.log(
      `Ride ${match.rideId} round ${match.round}: ${zoneIds.length} zones, ${eligible.length} drivers`,
    );

    match.timer = setTimeout(() => this.onTimeout(match), this.config.matching.offerSeconds * 1000);
  }

  private onTimeout(match: ActiveMatch): void {
    if (match.resolved) return;
    const elapsed = Date.now() - match.startedAt;
    const params = this.params(match.ranked.length);
    if (shouldContinue(match.round, elapsed, params)) {
      this.runRound(match);
    } else {
      void this.exhaust(match.rideId);
    }
  }

  /** Atomic claim from a driver's Accept (called by the Ride service). */
  async claim(rideId: string, driverId: string): Promise<ClaimOutcome> {
    const match = this.active.get(rideId);
    if (!match || match.resolved || !match.offered.has(driverId)) {
      return { won: false };
    }
    const won = await this.claims.tryClaim(rideId, driverId, 5000);
    if (!won) return { won: false };

    const assignment = this.drivers.assignmentFor(driverId);
    if (!assignment) {
      // Should not happen (driver was offered) — treat as lost to stay safe.
      return { won: false };
    }

    this.resolve(match);
    this.drivers.setOnRide(driverId, true);
    void this.bus.publish(
      createEnvelope({
        eventName: EventNames.DispatchAssigned,
        producer: 'dispatch',
        payload: {
          ride_id: rideId,
          driver_id: driverId,
          vehicle_id: assignment.vehicleId,
          round: match.round,
        },
      }),
    );
    return { won: true, vehicleId: assignment.vehicleId, zoneId: assignment.zoneId };
  }

  /** Stop matching a ride that ended by other means (passenger cancel). */
  cancel(rideId: string): void {
    const match = this.active.get(rideId);
    if (match) this.resolve(match);
  }

  private async exhaust(rideId: string): Promise<void> {
    const match = this.active.get(rideId);
    if (match) this.resolve(match);
    await this.bus.publish(
      createEnvelope({
        eventName: EventNames.DispatchExhausted,
        producer: 'dispatch',
        payload: { ride_id: rideId },
      }),
    );
    this.logger.warn(`Ride ${rideId}: no driver available, exhausted`);
  }

  private resolve(match: ActiveMatch): void {
    match.resolved = true;
    if (match.timer) clearTimeout(match.timer);
    this.active.delete(match.rideId);
  }
}
