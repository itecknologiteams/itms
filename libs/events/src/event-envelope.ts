import { v7 as uuidv7 } from 'uuid';

/**
 * Canonical envelope wrapping every domain event on the bus
 * (docs/data-model.md — Event Catalog). All producers emit this shape.
 */
export interface EventEnvelope<T = Record<string, unknown>> {
  event_id: string;
  event_name: string;
  occurred_at: string;
  producer: string;
  version: number;
  trace_id?: string;
  payload: T;
}

export interface CreateEventInput<T> {
  eventName: string;
  producer: string;
  payload: T;
  version?: number;
  traceId?: string;
  occurredAt?: string;
}

export function createEnvelope<T extends Record<string, unknown>>(
  input: CreateEventInput<T>,
): EventEnvelope<T> {
  return {
    event_id: uuidv7(),
    event_name: input.eventName,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    producer: input.producer,
    version: input.version ?? 1,
    trace_id: input.traceId,
    payload: input.payload,
  };
}

/** Domain event names — kept in sync with docs/data-model.md Event Catalog. */
export const EventNames = {
  UserRegistered: 'user.registered',
  DriverStatusChanged: 'driver.status.changed',
  DriverSuspended: 'driver.suspended',
  VehicleUpdated: 'vehicle.updated',
  RideRequested: 'ride.requested',
  DispatchOfferBroadcast: 'dispatch.offer.broadcast',
  DispatchAssigned: 'dispatch.assigned',
  DispatchExhausted: 'dispatch.exhausted',
  RideAssigned: 'ride.assigned',
  RideStarted: 'ride.started',
  RideEnded: 'ride.ended',
  RideCompleted: 'ride.completed',
  RideCancelled: 'ride.cancelled',
  FareCalculated: 'fare.calculated',
  FareConfigChanged: 'fare.config.changed',
  PaymentCompleted: 'payment.completed',
  PaymentFailed: 'payment.failed',
  PaymentRefunded: 'payment.refunded',
  VehicleLocationUpdated: 'vehicle.location.updated',
  TrackerStale: 'tracker.stale',
  GeofenceViolationDetected: 'geofence.violation.detected',
  GeofenceViolationClosed: 'geofence.violation.closed',
  GeofenceViolationEscalated: 'geofence.violation.escalated',
  ZoneUpdated: 'zone.updated',
  DocumentUploaded: 'document.uploaded',
  DocumentVerified: 'document.verified',
  NotificationSent: 'notification.sent',
  NotificationFailed: 'notification.failed',
} as const;

export type EventName = (typeof EventNames)[keyof typeof EventNames];
