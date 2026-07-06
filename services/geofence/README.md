# Geofence Service

Owns operating zones, vehicle↔zone pairing, movement passes, and the geofence
**violation lifecycle** with hysteresis (docs/specs.md §6; data-model.md · 05 geofence_db).

## Responsibilities
- **Zones**: CRUD of GeoJSON-polygon zones (PostGIS `geom` maintained by trigger),
  versioned on every boundary change.
- **Pairing**: assign each vehicle a primary zone; re-pairing is audited.
- **Containment + hysteresis**: consumes `vehicle.location.updated`, flags a vehicle
  **outside** only when it exceeds the margin (default 75 m) for the dwell period
  (default 120 s) — absorbing GPS drift and boundary-hugging.
- **Authorized-activity check**: active ride, post-ride return window, or admin
  movement pass suppress violations (docs/specs.md §6.4).
- **Violation lifecycle**: open → auto_closed (re-entry) / acknowledged → resolved /
  escalated; publishes `geofence.violation.detected/closed/escalated`.

## Key endpoints (v1)
| Method | Path | Role |
|---|---|---|
| GET/POST | `/v1/zones` | admin |
| PATCH | `/v1/zones/:id` | super admin (boundary edit → new version) |
| GET | `/v1/zones/check?lat=&lon=` | public (passenger service-area check) |
| PUT | `/v1/zones/vehicles/:vehicleId/pairing` | admin |
| POST | `/v1/zones/movement-passes` | admin |
| GET | `/v1/violations?status=&zone=` | admin |
| POST | `/v1/violations/:id/ack` `/resolve` `/escalate` | supervisor/super |

## Events
- **Publishes:** `zone.updated`, `geofence.violation.detected/closed/escalated`
- **Subscribes:** `vehicle.location.updated`, `ride.assigned/started/completed/cancelled`

## Notes
- The hysteresis decision is pure and unit-tested (`violation-decider.ts`); the hot
  path uses cached zone geometry (`ZoneRegistry`) and pure-TS geo math from `@itms/common`.
- Per-vehicle geo state and the zone cache are process-local in v1; production backs
  them with Redis so all replicas agree (documented limitation).
