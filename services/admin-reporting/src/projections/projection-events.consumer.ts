import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService, EventEnvelope, EventNames } from '@itms/events';
import { ProjectionsService } from './projections.service';

/**
 * Feeds every read-model projection from the domain event stream
 * (docs/architecture.md §2: Admin/Reporting subscribes to *all* domain events).
 */
@Injectable()
export class ProjectionEventsConsumer implements OnModuleInit {
  constructor(
    private readonly bus: EventBusService,
    private readonly projections: ProjectionsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe(
      [
        'ride.requested',
        'ride.completed',
        'ride.cancelled',
        'dispatch.exhausted',
        'driver.status.changed',
        'payment.completed',
        'geofence.violation.detected',
        'geofence.violation.closed',
        'geofence.violation.escalated',
      ],
      (env) => this.handle(env),
    );
  }

  private async handle(env: EventEnvelope): Promise<void> {
    const p = env.payload as Record<string, unknown>;
    const atMs = Date.parse(env.occurred_at) || Date.now();

    switch (env.event_name) {
      case EventNames.RideRequested:
        this.projections.markRideRequested(String(p.ride_id), atMs);
        return;
      case EventNames.RideCompleted:
        return this.projections.onRideCompleted(env.event_id, p as never, atMs);
      case EventNames.RideCancelled:
        return this.projections.onRideCancelled(env.event_id, p as never, atMs);
      case EventNames.DispatchExhausted:
        return this.projections.onDispatchExhausted(env.event_id, p as never, atMs);
      case EventNames.DriverStatusChanged:
        this.projections.markDriverOnlineChanged(String(p.driver_id), Boolean(p.online), atMs);
        return;
      case EventNames.PaymentCompleted:
        return this.projections.onPaymentCompleted(env.event_id, p as never, atMs);
      case EventNames.GeofenceViolationDetected:
        return this.projections.onViolationDetected(env.event_id, p as never, atMs);
      case EventNames.GeofenceViolationClosed:
        return this.projections.onViolationClosed(env.event_id, p as never, atMs);
      case EventNames.GeofenceViolationEscalated:
        return this.projections.onViolationEscalated(env.event_id, p as never, atMs);
      default:
        return;
    }
  }
}
