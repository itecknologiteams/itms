# Ride Service

Owns the ride state machine and orchestrates the ride-completion saga
(docs/specs.md §3; data-model.md · 07 ride_db; architecture.md §3.4).

## State machine
`requested → matching → assigned → arriving → in_progress → pending_payment → completed`
plus `no_driver_found`, `payment_failed` (+retry), and cancellation branches
(passenger / driver / no-show). The transition table is pure and fully unit-tested
(`domain/ride-state-machine.ts`). Every transition is actor-attributed in
`ride_transitions` and emitted as a domain event via the outbox.

## Endpoints (v1)
| Method | Path | Role |
|---|---|---|
| POST | `/v1/rides` | passenger — request (202, no fare shown) |
| GET | `/v1/rides/:id` | owner/driver |
| POST | `/v1/rides/:id/cancel` | passenger/driver |
| POST | `/v1/rides/:id/accept` | driver — atomic claim via Dispatch |
| POST | `/v1/rides/:id/arrived` `/start` `/end` `/no-show` | driver |
| POST | `/v1/rides/:id/rating` | passenger |
| POST | `/v1/rides/:id/sos` | participant |
| WS | `/v1/ws/rides` | ride-state / fare / SOS stream |

## Saga & guards
- **Accept** calls the Dispatch internal claim (first-accept-wins); fails closed to
  avoid double assignment.
- **Start** is guarded by pickup proximity (≤150 m, configurable).
- **End** emits `ride.ended`; Fare computes and emits `fare.calculated`; Payment
  emits `payment.completed/failed`; Ride transitions accordingly.
- **Driver cancel** re-matches up to a cap, then terminates as `cancelled_by_driver`.
- One active ride per passenger and per driver is enforced by partial unique indexes.

## Events
- **Publishes:** `ride.requested/assigned/started/ended/completed/cancelled`
- **Subscribes:** `dispatch.exhausted`, `fare.calculated`, `payment.completed/failed`
