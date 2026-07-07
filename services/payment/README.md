# Payment Service

Cash confirmation, JazzCash/card gateway processing, and receipts
(docs/specs.md §8; data-model.md · 09 payment_db).

## Flow
1. Consumes `fare.calculated` → caches `payable_rides(ride_id, amount_paisa)`
   (database-per-service: Payment never reads Fare's DB directly).
2. **Digital (JazzCash/Card):** `POST /rides/:id/pay` → gateway `initiate()` →
   success/failure, or `pending` awaiting an async **server-to-server callback**
   (`POST /callbacks/jazzcash|card`, signature-verified — client-side success
   alone never completes a ride, per docs/specs.md §8.1).
3. **Cash:** `POST /rides/:id/cash-received` (driver-confirmed).
4. On success, publishes `payment.completed`; Ride transitions to `COMPLETED`.
   On failure, publishes `payment.failed`; Ride retries or the passenger
   switches method (policy below).

## Retry & fallback policy (pure, unit-tested — `domain/payment-policy.ts`)
- Digital attempts capped at `maxDigitalRetries` (default 3); beyond that, cash-only.
- `idempotencyKey(rideId, attemptN)` = `pay:{ride_id}:{attempt_n}` — a unique DB
  index guarantees a replayed HTTP request never double-charges.
- Gateway callbacks dedupe on `gateway_txn_ref` (unique index); a **second
  success is never treated as authoritative** — it's logged for ops review,
  not silently accepted, since a ride can hold at most one `succeeded` payment
  (partial unique index on `ride_id WHERE status='succeeded'`).

## Gateway adapters — stubbed pending client credentials (OPEN-3)
`PaymentGateway` is a small interface (`initiate`, `verifyCallback`); the stub
JazzCash/card adapters simulate immediate success so idempotency, retries,
receipts, and the Ride saga can be built and tested end-to-end now. Swapping in
the real JazzCash API / 1LINK-compliant gateway is a new adapter behind the
same interface — no other code changes.

## Endpoints
| Method | Path | Role |
|---|---|---|
| POST | `/v1/payments/rides/:id/pay` | passenger |
| POST | `/v1/payments/rides/:id/cash-received` | driver |
| GET | `/v1/payments/rides/:id/receipt` | owner/admin |
| POST | `/v1/payments/callbacks/jazzcash` `/card` | gateway (signed, internal) |

## Events
- **Publishes:** `payment.completed`, `payment.failed`
- **Subscribes:** `fare.calculated`

## Not yet built (tracked, not silently skipped)
Refund execution against the real gateway, the daily reconciliation job, and
the unsettled-ride escalation scheduler are scaffolded in the data model
(`refunds`, `reconciliations`) and pure policy (`shouldFlagUnsettled`,
`shouldAutoFallbackToCash`) but not yet wired to a cron/scheduler — backlog
item for Phase 3 hardening (docs/testing.md, docs/devops.md).
