import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { EventNames, OutboxEntity } from '@itms/events';
import { DataSource, Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { computeFare } from '../domain/fare-formula';
import { FareCalculation } from '../entities/fare-calculation.entity';
import { FareConfigService } from '../configs/fare-config.service';
import { TrackingClient } from '../tracking/tracking.client';

interface RideEndedPayload {
  ride_id: string;
  vehicle_id?: string;
  started_at?: string;
  ended_at?: string;
  duration_s?: number;
  pickup_zone_id?: string | null;
  /** Optional pre-computed distance if the caller already has it; otherwise 0 as
   * a safe placeholder until the Tracking trail-slice lookup is wired in. */
  distance_m?: number;
}

/**
 * Computes the fare when a ride ends (docs/specs.md §7). The config used is the
 * one active at ride START time (§7.2) — we approximate with started_at from the
 * event payload, falling back to now if absent.
 *
 * Idempotent: a duplicate ride.ended re-delivery is a no-op if a calculation
 * already exists for the ride.
 */
@Injectable()
export class FareCalculationService {
  private readonly logger = new Logger(FareCalculationService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(FareCalculation) private readonly calculations: Repository<FareCalculation>,
    private readonly configs: FareConfigService,
    private readonly tracking: TrackingClient,
  ) {}

  async onRideEnded(payload: RideEndedPayload): Promise<void> {
    const existing = await this.calculations.findOne({ where: { rideId: payload.ride_id } });
    if (existing) {
      this.logger.debug(`Fare already calculated for ride ${payload.ride_id}; skipping`);
      return;
    }

    const startedAt = payload.started_at ? new Date(payload.started_at) : new Date();
    const config = await this.configs.activeAt(startedAt);
    const values = this.configs.toValues(config);
    const override = await this.configs.overrideFor(config.version, payload.pickup_zone_id ?? null);

    const durationS = payload.duration_s ?? 0;
    let distanceM = payload.distance_m;
    if (distanceM === undefined) {
      distanceM = await this.tracking.getTrailDistanceM(payload.ride_id) ?? undefined;
      if (distanceM === undefined) {
        // Tracking hasn't finalized the trail slice yet (both consume ride.ended
        // concurrently). Throwing triggers the event bus's built-in retry/backoff
        // (docs/architecture.md §3.2); after 3 attempts it lands in the DLQ for
        // manual replay rather than silently fare-ing a ride at 0 km.
        throw new Error(`Trail not yet available for ride ${payload.ride_id}`);
      }
    }

    const breakdown = computeFare({
      distanceM,
      durationS,
      config: values,
      zoneOverride: override,
    });

    await this.dataSource.transaction(async (mgr) => {
      await mgr.save(
        mgr.create(FareCalculation, {
          id: uuidv7(),
          rideId: payload.ride_id,
          fareConfigVersion: breakdown.configVersion,
          distanceM,
          durationS,
          basePaisa: String(breakdown.basePaisa),
          distanceComponentPaisa: String(breakdown.distanceComponentPaisa),
          timeComponentPaisa: String(breakdown.timeComponentPaisa),
          adjustments: {},
          totalPaisa: String(breakdown.totalPaisa),
        }),
      );
      await mgr.save(
        mgr.create(OutboxEntity, {
          id: uuidv7(),
          eventName: EventNames.FareCalculated,
          payload: {
            ride_id: payload.ride_id,
            fare_config_version: breakdown.configVersion,
            total_paisa: breakdown.totalPaisa,
            distance_m: distanceM,
            duration_s: durationS,
            breakdown: {
              base_paisa: breakdown.basePaisa,
              distance_component_paisa: breakdown.distanceComponentPaisa,
              time_component_paisa: breakdown.timeComponentPaisa,
              rounding_adjustment_paisa: breakdown.roundingAdjustmentPaisa,
            },
          },
          sentAt: null,
        }),
      );
    });

    this.logger.log(`Fare for ride ${payload.ride_id}: ${breakdown.totalPaisa} paisa (v${breakdown.configVersion})`);
  }
}
