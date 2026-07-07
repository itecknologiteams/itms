import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService, EventEnvelope, EventNames } from '@itms/events';
import { DriversService } from './drivers.service';

/**
 * Keeps driver.online in sync with ride activity and enforces the violation
 * escalation policy (docs/specs.md §6.5, A-09): a `geofence.violation.escalated`
 * event forcibly suspends the driver currently bound to the offending vehicle.
 */
@Injectable()
export class DriverEventsConsumer implements OnModuleInit {
  constructor(
    private readonly bus: EventBusService,
    private readonly drivers: DriversService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe(
      ['dispatch.assigned', 'ride.completed', 'ride.cancelled', 'geofence.violation.escalated'],
      (env) => this.handle(env),
    );
  }

  private async handle(env: EventEnvelope): Promise<void> {
    const p = env.payload as Record<string, unknown>;
    switch (env.event_name) {
      case EventNames.DispatchAssigned:
        if (p.driver_id) await this.drivers.setOnTrip(String(p.driver_id), true).catch(() => undefined);
        return;
      case EventNames.RideCompleted:
      case EventNames.RideCancelled:
        if (p.driver_id) await this.drivers.setOnTrip(String(p.driver_id), false).catch(() => undefined);
        return;
      case EventNames.GeofenceViolationEscalated:
        if (p.vehicle_id) {
          await this.drivers.suspendFromViolation(
            String(p.vehicle_id),
            'Escalated geofence violation',
          );
        }
        return;
      default:
        return;
    }
  }
}
