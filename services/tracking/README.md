# Tracking Service

Ingests high-frequency GPS from vehicle trackers, serves the live-location layer,
and stores durable history (docs/specs.md §9; data-model.md · 06 tracking_db).

## Pipeline
```
MQTT (tracker/<id>/pos) → normalize → TrackingService.ingest:
   ├─ Redis GEO live layer (dispatch + admin map, sub-ms reads)
   ├─ TimescaleDB history buffer (batched inserts)
   ├─ tracker_health touch
   └─ sampled vehicle.location.updated (default every 30s/vehicle)
```

- **Sampling:** raw pings arrive every 5–10 s but the firehose does NOT hit the
  event bus — only a throttled `vehicle.location.updated` per vehicle.
- **Health monitor:** vehicles with no ping > 60 s → `stale` (excluded from dispatch,
  emits `tracker.stale`); > 10 min → `dead` (admin alert).
- **Trails:** on `ride.started`/`ride.ended` a trail slice is computed (haversine with
  a >140 km/h outlier filter) and bound to the ride for fare & replay.

## Endpoints
| Method | Path | Role |
|---|---|---|
| GET | `/v1/tracking/vehicles/:vehicleId` | admin / driver — live fix |
| GET | `/v1/internal/nearby?lat=&lon=&radius=` | internal (Dispatch proximity) |
| GET | `/health` `/ready` | public |

## Events
- **Publishes:** `vehicle.location.updated` (sampled), `tracker.stale`
- **Subscribes:** `vehicle.updated` (device→vehicle map), `ride.started/ended/completed` (trails)

## Notes
- Core pieces are pure and unit-tested: ping normalization/validation and the
  sampling throttle. Redis and MQTT are behind thin adapters.
- `TRACKER_TOPIC_IS_VEHICLE_ID=true` lets the dev GPS simulator publish under
  `tracker/<vehicleId>/pos` without a device-mapping step.
- TimescaleDB hypertable is created when the extension is present; the local
  PostGIS image falls back to a plain table (migration handles both).
