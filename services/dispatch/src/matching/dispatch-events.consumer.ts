import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService, EventEnvelope, EventNames } from '@itms/events';
import { DriverRegistry } from '../registries/driver-registry.service';
import { ZoneCache } from '../registries/zone-cache.service';
import { MatchingService } from './matching.service';

/**
 * Feeds the matching engine and its projections from domain events
 * (docs/architecture.md §2). Consumers are idempotent (safe on re-delivery).
 */
@Injectable()
export class DispatchEventsConsumer implements OnModuleInit {
  constructor(
    private readonly bus: EventBusService,
    private readonly matching: MatchingService,
    private readonly drivers: DriverRegistry,
    private readonly zones: ZoneCache,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe(
      [
        'ride.requested',
        'ride.completed',
        'ride.cancelled',
        'driver.status.changed',
        'vehicle.updated',
        'vehicle.location.updated',
        'tracker.stale',
        'zone.updated',
      ],
      (env) => this.handle(env),
    );
  }

  private async handle(env: EventEnvelope): Promise<void> {
    const p = env.payload as Record<string, unknown>;
    switch (env.event_name) {
      case EventNames.RideRequested: {
        const pickup = p.pickup as { lat: number; lon: number };
        this.matching.startMatching(String(p.ride_id), pickup, Date.parse(env.occurred_at) || Date.now());
        return;
      }
      case EventNames.RideCancelled:
        this.matching.cancel(String(p.ride_id));
        if (p.driver_id) this.drivers.setOnRide(String(p.driver_id), false);
        return;
      case EventNames.RideCompleted:
        if (p.driver_id) this.drivers.setOnRide(String(p.driver_id), false);
        return;
      case EventNames.DriverStatusChanged:
        this.drivers.setOnline(
          String(p.driver_id),
          p.vehicle_id ? String(p.vehicle_id) : null,
          Boolean(p.online),
        );
        return;
      case EventNames.VehicleUpdated:
        if (p.vehicle_id && p.paired_zone_id) {
          this.drivers.setVehicleZone(String(p.vehicle_id), String(p.paired_zone_id));
        }
        return;
      case EventNames.VehicleLocationUpdated:
        if (p.vehicle_id) this.drivers.setTracker(String(p.vehicle_id), true);
        return;
      case EventNames.TrackerStale:
        if (p.vehicle_id) this.drivers.setTracker(String(p.vehicle_id), false);
        return;
      case EventNames.ZoneUpdated:
        await this.zones.refresh();
        return;
      default:
        return;
    }
  }
}
