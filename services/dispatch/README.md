# Dispatch Service

The matching engine: 3-nearest-zone broadcast with one-zone-per-round expansion
and atomic first-accept-wins (docs/specs.md §5; architecture.md §2). Redis-only —
no SQL database; the durable ride journal lives in the Ride service's outbox.

## Flow
1. Consumes `ride.requested` → ranks active zones by distance to pickup.
2. Round 1 broadcasts `dispatch.offer.broadcast` to eligible drivers in the 3
   nearest zones; each round adds one more zone (up to `maxZones` / `maxTotalWait`).
3. Driver Accept → Ride calls `POST /v1/internal/claim` → atomic Redis `SET NX`;
   the winner gets `dispatch.assigned`, losers get 409 from Ride.
4. No acceptance within the caps → `dispatch.exhausted` (Ride → `no_driver_found`).

## Eligibility projection
Built in-memory from events: `driver.status.changed` (online + vehicle),
`vehicle.updated` (zone pairing), `vehicle.location.updated` / `tracker.stale`
(tracker freshness), and ride events (on-ride flag). A driver is eligible when
online, not on a ride, paired to an in-set zone, and its tracker is fresh.

## Pure, unit-tested cores
- `domain/zone-selection.ts` — distance ranking + per-round zone set
- `domain/expansion.ts` — expansion/stop policy

## Events
- **Publishes:** `dispatch.offer.broadcast`, `dispatch.assigned`, `dispatch.exhausted`
- **Subscribes:** `ride.requested/completed/cancelled`, `driver.status.changed`,
  `vehicle.updated`, `vehicle.location.updated`, `tracker.stale`, `zone.updated`

## Limitations (v1)
Round timers and projections are process-local (single-replica dispatch).
Production coordinates rounds and shares projections via Redis so any replica can
drive them; the claim itself is already Redis-atomic and replica-safe.
