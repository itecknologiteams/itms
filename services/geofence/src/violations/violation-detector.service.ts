import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { distanceOutsideMeters } from '@itms/common';
import {
  EventBusService,
  EventEnvelope,
  EventNames,
  OutboxEntity,
} from '@itms/events';
import { Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { GEOFENCE_CONFIG, GeofenceConfig } from '../config/configuration';
import { Violation, ViolationStatus } from '../entities/violation.entity';
import { ZoneRegistry } from '../zones/zone-registry.service';
import { AuthorizationService } from './authorization.service';
import { decide, initialGeoState, VehicleGeoState } from './violation-decider';

interface LocationPayload {
  vehicle_id: string;
  lat: number;
  lon: number;
  at?: string;
}

/**
 * Consumes vehicle location + ride events and applies the hysteresis decider
 * (docs/specs.md §6.3–6.5), opening/closing violations and publishing
 * geofence.violation.detected / .closed via the outbox.
 *
 * Per-vehicle geo state is process-local in v1 (Redis-backed in production for
 * multi-replica correctness — documented limitation).
 */
@Injectable()
export class ViolationDetectorService implements OnModuleInit {
  private readonly logger = new Logger(ViolationDetectorService.name);
  private readonly state = new Map<string, VehicleGeoState>();

  constructor(
    @Inject(GEOFENCE_CONFIG) private readonly config: GeofenceConfig,
    private readonly bus: EventBusService,
    private readonly registry: ZoneRegistry,
    private readonly authz: AuthorizationService,
    @InjectRepository(Violation) private readonly violations: Repository<Violation>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe(
      ['vehicle.location.updated', 'ride.assigned', 'ride.started', 'ride.completed', 'ride.cancelled'],
      (env) => this.handle(env),
    );
  }

  private async handle(env: EventEnvelope): Promise<void> {
    switch (env.event_name) {
      case EventNames.VehicleLocationUpdated:
        return this.onLocation(env.payload as unknown as LocationPayload);
      case EventNames.RideAssigned:
      case EventNames.RideStarted: {
        const p = env.payload as { vehicle_id?: string };
        if (p.vehicle_id) this.authz.markRideActive(p.vehicle_id);
        return;
      }
      case EventNames.RideCompleted:
      case EventNames.RideCancelled: {
        const p = env.payload as { vehicle_id?: string };
        if (p.vehicle_id) this.authz.markRideEnded(p.vehicle_id, Date.parse(env.occurred_at));
        return;
      }
      default:
        return;
    }
  }

  private async onLocation(loc: LocationPayload): Promise<void> {
    const paired = this.registry.getPairedZone(loc.vehicle_id);
    if (!paired) return; // unpaired vehicles are not monitored

    const now = loc.at ? Date.parse(loc.at) : Date.now();
    const distanceOutsideM = distanceOutsideMeters(
      { lat: loc.lat, lon: loc.lon },
      paired.ring,
    );

    const authorized = await this.authz.isAuthorized(loc.vehicle_id, now);
    const prev = this.state.get(loc.vehicle_id) ?? initialGeoState();

    const { action, state } = decide({
      distanceOutsideM,
      now,
      marginM: this.config.hysteresis.marginMeters,
      dwellMs: this.config.hysteresis.dwellSeconds * 1000,
      authorized,
      state: prev,
    });

    if (action.type === 'open') {
      const id = uuidv7();
      await this.openViolation(id, loc.vehicle_id, paired.zoneId, new Date(now), action.maxDistanceM);
      state.openViolationId = id;
    } else if (action.type === 'close') {
      if (prev.openViolationId) await this.closeViolation(prev.openViolationId, new Date(now));
    }

    this.state.set(loc.vehicle_id, state);
  }

  private async openViolation(
    id: string,
    vehicleId: string,
    zoneId: string,
    openedAt: Date,
    maxDistanceM: number,
  ): Promise<void> {
    await this.violations.manager.transaction(async (mgr) => {
      await mgr.save(
        mgr.create(Violation, {
          id,
          vehicleId,
          driverId: null,
          zoneId,
          status: ViolationStatus.Open,
          openedAt,
          maxDistanceM,
        }),
      );
      await mgr.save(
        mgr.create(OutboxEntity, {
          id: uuidv7(),
          eventName: EventNames.GeofenceViolationDetected,
          payload: { violation_id: id, vehicle_id: vehicleId, zone_id: zoneId, max_distance_m: maxDistanceM },
          sentAt: null,
        }),
      );
    });
    this.logger.warn(`Violation opened: vehicle=${vehicleId} zone=${zoneId} maxDist=${maxDistanceM}m`);
  }

  private async closeViolation(id: string, closedAt: Date): Promise<void> {
    const v = await this.violations.findOne({ where: { id } });
    if (!v || v.status !== ViolationStatus.Open) return;
    await this.violations.manager.transaction(async (mgr) => {
      v.status = ViolationStatus.AutoClosed;
      v.closedAt = closedAt;
      await mgr.save(v);
      await mgr.save(
        mgr.create(OutboxEntity, {
          id: uuidv7(),
          eventName: EventNames.GeofenceViolationClosed,
          payload: { violation_id: v.id, vehicle_id: v.vehicleId, zone_id: v.zoneId },
          sentAt: null,
        }),
      );
    });
    this.logger.log(`Violation auto-closed: ${id}`);
  }
}
