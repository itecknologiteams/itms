# Passenger Service

Passenger profiles, saved payment method tokens, and the ride-history
projection (docs/specs.md P-01…P-13; data-model.md · 02 passenger_db).

## Responsibilities
- **Profile:** completed after first OTP login. Phone is resolved from Auth's
  internal API (`GET /internal/users/:id`) — never trusted from client input,
  since the passenger's JWT carries only `sub`/`role` (database-per-service:
  Passenger doesn't read `auth_db` directly).
- **Saved payment methods:** gateway **tokens only** — no PAN/wallet credentials
  are ever stored here (docs/security.md §3, PCI SAQ-A scope).
- **Booking eligibility (pure, unit-tested — `domain/booking-eligibility.ts`):**
  blocked passengers, and passengers with an unsettled fare, cannot book
  (docs/specs.md §8.2). Deterministic precedence, tested.
- **Ride history:** a local projection built from `ride.completed` — Ride remains
  the system of record; this is a read-optimized copy for the passenger app.

## Endpoints (v1)
| Method | Path | Role |
|---|---|---|
| POST/GET/PATCH | `/v1/passengers/me` | passenger |
| GET | `/v1/passengers/me/rides` | passenger |
| GET/POST/DELETE | `/v1/passengers/me/payment-methods` | passenger |
| GET | `/v1/passengers/:id` | admin |
| PATCH | `/v1/passengers/:id/block` `/unblock` | supervisor+ |

## Events
- **Subscribes:** `ride.completed` (history projection + clears unsettled flag)

## Known follow-up (documented, not silently skipped)
`payment.failed` doesn't currently carry `passenger_id`, so this service can't
yet set the unsettled-fare flag from that event alone — tracked as a payload
addition for Ride/Payment rather than papered over with a synchronous lookup.
