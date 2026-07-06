# Data Model — Per-Service Schemas & Event Contracts

**Doc:** `data-model.md` · **Version:** 1.0 · **Status:** Baseline for build

Conventions: UUID v7 primary keys (`id`), `created_at`/`updated_at` (timestamptz) on every table,
soft business immutability (terminal records never deleted), snake_case, all money in **PKR integer paisa**
(`amount_paisa BIGINT`) to avoid float errors. `city_id` reserved column noted where applicable.

---

## 01 auth_db

```sql
users            (id, phone UNIQUE, phone_verified_at, email, password_hash NULL, -- password only for admins
                  role ENUM(passenger, driver, admin_operator, admin_supervisor, admin_super),
                  status ENUM(active, blocked), totp_secret NULL, last_login_at)
otp_challenges   (id, phone, code_hash, purpose ENUM(login, register), expires_at, attempts, consumed_at)
refresh_tokens   (id, user_id FK, token_hash, device_id, expires_at, revoked_at)
devices          (id, user_id FK, platform, fcm_token, model, app_version, is_active, last_seen_at)
```
Rules: max 5 OTP attempts / 30 min per phone; one active device per driver (D-01); JWT RS256, access 15 min / refresh 30 days (rotating).

## 02 passenger_db

```sql
passengers        (id, auth_user_id, name, phone, email NULL, language ENUM(en, ur),
                   status ENUM(active, blocked), unsettled_ride_id NULL, rating_avg NUMERIC(3,2))
saved_methods     (id, passenger_id FK, type ENUM(jazzcash, card), gateway_token, label, is_default)
ride_history_proj (ride_id, passenger_id, driver_name, plate_no, started_at, ended_at,
                   distance_m, duration_s, fare_paisa, payment_method, status)  -- projection from events
```

## 03 driver_db

```sql
drivers           (id, auth_user_id, name, phone, cnic, license_no, license_expiry,
                   photo_doc_id, status ENUM(pending, approved, suspended, retired),
                   online ENUM(offline, online, on_trip), current_vehicle_id NULL, rating_avg)
vehicles          (id, plate_no UNIQUE, model, year, color, tracker_device_id UNIQUE,
                   paired_zone_id, status ENUM(active, maintenance, retired), city_id)
driver_vehicle_assignments (id, driver_id, vehicle_id, from_ts, to_ts NULL)  -- history
driver_documents  (id, driver_id, type ENUM(license, cnic, photo, registration), media_id,
                   status ENUM(pending, approved, rejected), reviewed_by, expiry_date NULL)
suspensions       (id, driver_id, reason, source ENUM(admin, violation_policy), from_ts, to_ts NULL, lifted_by NULL)
```

## 04 Dispatch (Redis — live state only; durable journal via Ride outbox)

```
ride:{id}:claim            SET NX PX 5000       -- atomic accept (specs §5.4)
ride:{id}:round            HASH round_n, zones[], offered_driver_ids[], expires_at
driver:{id}:offer          STRING ride_id  EX T_offer
dispatch:config            HASH t_offer_s, max_zones, max_total_wait_s
```

## 05 geofence_db (PostGIS)

```sql
zones             (id, name, boundary GEOMETRY(POLYGON, 4326), center GEOMETRY(POINT, 4326),
                   status ENUM(active, inactive), version INT, city_id)
zone_versions     (id, zone_id, boundary, changed_by, changed_at)          -- audit (6.1)
vehicle_zone_pairings (id, vehicle_id, zone_id, from_ts, to_ts NULL, assigned_by)
movement_passes   (id, vehicle_id, reason, granted_by, from_ts, to_ts)     -- authorized out-of-zone (6.4)
violations        (id, vehicle_id, driver_id NULL, zone_id, status ENUM(open, auto_closed, acknowledged, resolved, escalated),
                   opened_at, closed_at NULL, max_distance_m, trail_ref, ack_by NULL, resolution_note NULL)
```
Indexes: GiST on `zones.boundary`; violations by (vehicle_id, opened_at).

## 06 tracking_db (TimescaleDB)

```sql
gps_logs  HYPERTABLE (time timestamptz, vehicle_id, lat, lon, speed_kmh, heading,
                      ignition BOOL, source ENUM(tracker, driver_app), battery_pct NULL)
          -- chunk 1 day, compress > 7 days, retention job per [OPEN-8]
trail_slices (id, ride_id UNIQUE, vehicle_id, from_ts, to_ts, distance_m, point_count,
              archive_url NULL)          -- bound at ride start/end (specs §9)
tracker_health (device_id PK, vehicle_id, last_ping_at, status ENUM(ok, stale, dead))
```
Redis live layer: `GEOADD vehicles:free|ontrip {lon} {lat} {vehicle_id}` + `HSET vehicle:{id} last_ping ...`.

## 07 ride_db

```sql
rides             (id, passenger_id, driver_id NULL, vehicle_id NULL,
                   status ENUM(requested, matching, assigned, arriving, in_progress,
                               pending_payment, payment_failed, completed,
                               cancelled_by_passenger, cancelled_by_driver, cancelled_no_show, no_driver_found),
                   pickup_point GEOGRAPHY(POINT), pickup_zone_id, dropoff_point GEOGRAPHY(POINT) NULL,
                   requested_at, assigned_at NULL, arrived_at NULL, started_at NULL, ended_at NULL,
                   distance_m NULL, duration_s NULL, fare_paisa NULL, fare_config_version NULL,
                   payment_method NULL, cancel_reason NULL, city_id)
ride_transitions  (id, ride_id, from_status, to_status, actor ENUM(passenger, driver, system, admin),
                   actor_id, at, meta JSONB)                    -- full audit (specs §3 invariants)
dispatch_journal  (id, ride_id, round_n, zone_ids[], offered_driver_ids[], outcome, at)  -- §5.4 durability
ratings           (id, ride_id UNIQUE, passenger_id, driver_id, stars SMALLINT CHECK 1..5,
                   comment NULL, created_at)
sos_events        (id, ride_id, raised_by, lat, lon, at, handled_by NULL, note NULL)
outbox            (id, event_name, payload JSONB, created_at, sent_at NULL)   -- pattern used in ALL services
```

## 08 fare_db

```sql
fare_configs      (id, version INT UNIQUE, base_paisa, per_km_paisa, per_min_paisa,
                   minimum_paisa, rounding ENUM(nearest_10, none), night_multiplier NUMERIC NULL,
                   effective_from, created_by, created_at)      -- never edited; new version per change (specs §7.2)
zone_fare_overrides (id, fare_config_version, zone_id, per_km_paisa NULL, per_min_paisa NULL, multiplier NULL)
fare_calculations (id, ride_id UNIQUE, fare_config_version, distance_m, duration_s,
                   base_paisa, distance_component_paisa, time_component_paisa,
                   adjustments JSONB, total_paisa, computed_at)
fare_adjustments  (id, ride_id, old_total_paisa, new_total_paisa, reason, adjusted_by, at)  -- §7.3 disputes
```

## 09 payment_db

```sql
payments          (id, ride_id, method ENUM(cash, jazzcash, card), amount_paisa,
                   status ENUM(initiated, pending_gateway, succeeded, failed, refunded),
                   attempt_n, idempotency_key UNIQUE, gateway_txn_ref UNIQUE NULL,
                   gateway_response JSONB, initiated_at, settled_at NULL)
refunds           (id, payment_id, amount_paisa, reason, initiated_by, gateway_ref, status, at)
reconciliations   (id, date, gateway ENUM(jazzcash, card), report_url, matched_count,
                   mismatched_count, status, notes)
```
Rules: one `succeeded` payment per ride (partial unique index); duplicate gateway callback → no-op by `gateway_txn_ref`.

## 10 notif_db

```sql
templates         (id, key, channel ENUM(push, sms), lang ENUM(en, ur), title, body, updated_by)
notifications     (id, user_id, channel, template_key, payload JSONB,
                   status ENUM(queued, sent, delivered, failed), provider_ref, sent_at)
broadcasts        (id, audience ENUM(all_drivers, all_passengers), template_key, sent_by, at, count)
```

## 11 reporting_db (CQRS projections — rebuildable)

```sql
rides_daily        (date, zone_id, city_id, rides_completed, rides_cancelled, no_driver_count,
                    revenue_paisa, avg_fare_paisa, avg_match_seconds)
driver_performance (driver_id, date, rides, online_hours, earnings_paisa, rating_avg, violations)
violation_summary  (zone_id, date, opened, auto_closed, escalated, avg_duration_s)
payment_mix        (date, method, count, amount_paisa)
admin_audit_log    (id, admin_id, action, entity, entity_id, before JSONB, after JSONB, at, ip)
projection_offsets (projection_name PK, last_event_id, updated_at)
```

## 12 document_db + object storage

```sql
media             (id, owner_type ENUM(driver, ride, admin), owner_id, kind ENUM(license, cnic, photo,
                   registration, receipt_pdf), bucket_key, mime, size_bytes, sha256,
                   scan_status ENUM(pending, clean, infected), uploaded_by, created_at)
```
Bucket layout: `itms-{env}/{kind}/{owner_id}/{media_id}` — access via time-limited signed URLs only.

---

## Event Catalog (bus contracts)

Envelope (all events):
```json
{ "event_id": "uuid7", "event_name": "ride.completed", "occurred_at": "ISO8601",
  "producer": "ride", "version": 1, "trace_id": "...", "payload": { } }
```

| Event | Key payload fields |
|---|---|
| `user.registered` | user_id, role, phone |
| `driver.status.changed` | driver_id, vehicle_id, online |
| `driver.suspended` | driver_id, reason, until |
| `vehicle.updated` | vehicle_id, paired_zone_id, status |
| `ride.requested` | ride_id, passenger_id, pickup {lat,lon}, pickup_zone_id |
| `dispatch.offer.broadcast` | ride_id, round_n, zone_ids, offered_driver_ids |
| `dispatch.assigned` | ride_id, driver_id, vehicle_id, round_n |
| `dispatch.exhausted` | ride_id, rounds, total_wait_s |
| `ride.assigned / started / ended / completed / cancelled` | ride_id, actor, timestamps, (ended: distance_m, duration_s) |
| `fare.calculated` | ride_id, fare_config_version, total_paisa, breakdown |
| `fare.config.changed` | version, effective_from, changed_by |
| `payment.completed / failed / refunded` | ride_id, payment_id, method, amount_paisa, gateway_txn_ref |
| `vehicle.location.updated` (30 s sampled) | vehicle_id, lat, lon, speed, at |
| `tracker.stale` | vehicle_id, last_ping_at |
| `geofence.violation.detected / closed / escalated` | violation_id, vehicle_id, zone_id, distance_m, duration_s |
| `zone.updated` | zone_id, version, status |
| `document.uploaded / verified` | media_id, owner_id, kind, status |
| `notification.sent / failed` | notification_id, channel, user_id |

Versioning: additive fields only within `version`; breaking change bumps `version` and consumers pin.
