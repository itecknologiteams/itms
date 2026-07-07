# Admin/Reporting Service

CQRS read models built from the full domain event stream, plus the admin
audit trail (docs/architecture.md §2, §7.4; data-model.md · 11 reporting_db).

## Projections
| Table | Fed by |
|---|---|
| `rides_daily` | `ride.requested` (match-time start), `ride.completed`, `ride.cancelled`, `dispatch.exhausted` |
| `driver_performance` | `ride.completed` (rides/earnings), `driver.status.changed` (online hours) |
| `violation_summary` | `geofence.violation.detected/closed/escalated` |
| `payment_mix` | `payment.completed` |

All are genuine read models: rebuildable from the event log/DLQ replay tooling
(docs/devops.md §7) if ever reset — no data lives here that isn't derived.

## Idempotency — refines the docs/data-model.md sketch
The original design sketched a `projection_offsets(last_event_id)` table,
which fits a log-based broker with ordered per-partition offsets (Kafka). On
RabbitMQ's at-least-once delivery there's no single ordered offset across
event types, and **incremental aggregates can't be made idempotent by
re-applying the same delta twice** (unlike a plain upsert). This service
instead records `processed_events(event_id, projection_name)` and wraps every
aggregate mutation in a transaction with that insert — a redelivered event
hits a primary-key violation and the whole update rolls back untouched.

## Admin audit log — explicit write, not event-inferred
`admin_audit_log` is written via `POST /internal/audit-log` by the **acting**
service at the moment of a mutation, not reconstructed from domain events —
most existing events (e.g. `zone.updated`) don't carry enough
before/after/actor detail to rebuild a proper audit entry. Every admin-facing
service should call this endpoint when it changes state on an admin's behalf.
**Follow-up (tracked, not done here):** wiring that call into the already-built
services (Geofence zone edits, Fare config changes, Driver suspensions, etc.)
is the next integration pass — this service's own write/query API is complete.

## Endpoints
| Method | Path | Role |
|---|---|---|
| GET | `/v1/admin/reports/:report?from=&to=&format=json\|csv` | admin |
| POST | `/v1/admin/internal/audit-log` | internal |
| GET | `/v1/admin/audit-log?entity=&admin_id=` | super admin |

`:report` is one of `rides_daily`, `driver_performance`, `violations`, `payment_mix`.

## Known simplification (v1, documented)
Match-time and online-hours tracking use small in-memory maps
(`ride_id → requested_at`, `driver_id → online_since`), consistent with the
same documented single-replica limitation already noted in Dispatch and
Geofence for their process-local projections. Production backs these with
Redis so any replica agrees.
