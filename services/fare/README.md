# Fare Service

Configurable fare-formula engine, computed only after a ride ends
(docs/specs.md §7; data-model.md · 08 fare_db).

## Formula (pure, unit-tested)
```
fare = base + per_km * distance_km + per_min * duration_min   (zone override may replace rates)
fare *= zone_multiplier * night_multiplier                     (if applicable)
fare = max(fare, minimum)
fare = round per config.rounding                                (nearest_10 | none)
```
`domain/fare-formula.ts` is pure and has no I/O — golden-file-style tests cover
the minimum floor, rounding, zone overrides, and the night multiplier.

## Versioning
Configs are **never edited in place** — every admin change inserts a new
`fare_configs` row with an incremented `version` and `effective_from = now()`.
A ride uses the version active **at its start time** (`activeAt`), so an
in-flight ride is never affected by a same-day rate change.

A placeholder baseline (v1: PKR 100 base / 50 per km / 2 per min / 150 minimum)
seeds the database so the engine works end-to-end before the client's real
formula arrives (**OPEN-1**) — swapping it in later is just a new version, no
downtime or code change.

## Flow
1. Consumes `ride.ended`.
2. Looks up the real trip distance from Tracking's trail slice
   (`GET /v1/internal/trails/:rideId`). If Tracking hasn't finalized the slice
   yet (both services consume `ride.ended` concurrently), the handler throws —
   the event bus's built-in retry/backoff (docs/architecture.md §3.2) resolves
   the race; after 3 attempts it lands in the DLQ instead of silently fare-ing
   a ride at 0 km.
3. Computes and persists `fare_calculations`, publishes `fare.calculated`.
4. Idempotent: a re-delivered `ride.ended` for an already-calculated ride is a no-op.

## Endpoints
| Method | Path | Role |
|---|---|---|
| GET/POST | `/v1/fare-configs` | admin (create = super admin only) |

## Events
- **Publishes:** `fare.calculated`, `fare.config.changed`
- **Subscribes:** `ride.ended`
