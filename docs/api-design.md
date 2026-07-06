# API Design — Conventions, Endpoints, Realtime Contracts

**Doc:** `api-design.md` · **Version:** 1.0 · **Status:** Baseline for build

All public traffic terminates at Kong (`https://api.itms.example/v1/...`). Kong routes by path prefix
to services. Every service also publishes OpenAPI 3.1 at `/docs` (internal only).

---

## 1. Conventions

- **Auth:** `Authorization: Bearer <JWT>` (RS256, issued by Auth). Kong validates signature/expiry; services enforce role & ownership. Public (no-auth) endpoints: OTP request/verify, health.
- **Roles in JWT:** `passenger | driver | admin_operator | admin_supervisor | admin_super` + `sub`, `device_id`.
- **Errors — one envelope everywhere:**
```json
{ "error": { "code": "RIDE_NOT_CANCELLABLE", "message": "Ride already in progress",
             "trace_id": "…", "details": {} } }
```
  HTTP: 400 validation · 401 auth · 403 role/ownership · 404 · 409 state conflict · 422 domain rule · 429 rate limit · 5xx.
- **Idempotency:** all POSTs that create money- or ride-affecting state accept `Idempotency-Key` header (stored 24 h; replay returns original response).
- **Pagination:** cursor-based `?cursor=&limit=` (max 100); response `{ data: [], next_cursor }`.
- **Rate limits (Kong):** OTP 5/30 min/phone; ride create 10/h/passenger; general 60/min/token.
- **Timestamps** ISO-8601 UTC; **money** integer paisa; **coords** `{ "lat": …, "lon": … }`.

---

## 2. Endpoint Catalog (v1)

### Auth — `/v1/auth`
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/otp/request` | public | Send OTP `{phone, purpose}` |
| POST | `/otp/verify` | public | Verify → `{access, refresh, is_new_user}` |
| POST | `/token/refresh` | any | Rotate refresh token |
| POST | `/logout` | any | Revoke refresh + device |
| POST | `/admin/login` | public | Email+password → TOTP challenge |
| POST | `/admin/totp` | public | TOTP verify → tokens |

### Passenger — `/v1/passengers`
| POST | `/me` | passenger | Complete profile after first OTP login |
| GET/PATCH | `/me` | passenger | Profile |
| GET | `/me/rides` | passenger | Ride history (paginated) |
| GET | `/me/rides/{id}` | passenger | Detail + receipt + trail summary |
| GET/POST/DELETE | `/me/payment-methods` | passenger | Saved methods (gateway tokens) |

### Driver — `/v1/drivers`
| GET/PATCH | `/me` | driver | Profile, documents status |
| PUT | `/me/status` | driver | `{online: true/false}` (guard: not on trip) |
| GET | `/me/earnings?range=` | driver | Totals + per-ride list |
| GET | `/me/rides` | driver | History |
| POST | `/me/documents` | driver | Upload via signed URL handshake with Document svc |

### Rides — `/v1/rides` (core flow)
| POST | `/` | passenger | Create request `{pickup, dropoff}` → `202 {ride_id, status: matching}` |
| GET | `/{id}` | owner/driver/admin | Current state (poll fallback) |
| POST | `/{id}/cancel` | passenger/driver | `{reason}` (guards per state machine) |
| POST | `/{id}/accept` | driver | Accept offer (atomic; 409 if lost race) |
| POST | `/{id}/arrived` | driver | ARRIVING |
| POST | `/{id}/start` | driver | Guard: GPS within 150 m of pickup |
| POST | `/{id}/end` | driver | Triggers fare saga |
| POST | `/{id}/no-show` | driver | Guard: ≥5 min waiting + proximity |
| POST | `/{id}/rating` | passenger | `{stars, comment?}` |
| POST | `/{id}/sos` | passenger/driver | SOS flag (specs P-15) |

### Payments — `/v1/payments`
| POST | `/rides/{id}/pay` | passenger | `{method, saved_method_id?}` → gateway redirect/params or cash instruction |
| POST | `/rides/{id}/cash-received` | driver | Cash confirmation |
| POST | `/callbacks/jazzcash` | gateway (signed) | Server-to-server confirmation |
| POST | `/callbacks/card` | gateway (signed) | Same |
| GET | `/rides/{id}/receipt` | owner/admin | Receipt JSON + PDF link |

### Geofence — `/v1/zones` (admin) & internal
| GET/POST | `/` | admin | List / create zone (GeoJSON polygon) |
| PATCH | `/{id}` | admin_super | Edit boundary/status (creates version) |
| GET | `/{id}/vehicles` | admin | Paired vehicles |
| PUT | `/vehicles/{vehicleId}/pairing` | admin | Re-pair vehicle `{zone_id}` |
| POST | `/movement-passes` | admin | Time-boxed out-of-zone authorization |
| GET | `/violations?status=&zone=` | admin | Violation queue |
| POST | `/violations/{id}/ack` / `/resolve` | supervisor | Lifecycle actions |
| GET | `/check?lat=&lon=` | passenger app | `{in_service_zone, zone_id}` |

### Admin & Reporting — `/v1/admin`
| GET | `/fleet/live` | admin | Live map snapshot (REST bootstrap for WS) |
| GET | `/rides?status=&zone=&from=&to=` | admin | Ride monitor |
| GET | `/rides/{id}/replay` | admin | Trail for playback |
| GET/POST | `/fare-configs` | admin_super | List / create new version |
| GET | `/reports/{rides_daily|driver_performance|violations|payment_mix}` | admin | + `?format=csv` |
| GET | `/audit-log` | admin_super | Filterable audit trail |
| POST | `/broadcasts` | admin_super | Push announcement |
| GET/PATCH | `/drivers`, `/drivers/{id}` | admin | Onboarding review, suspend/approve |
| GET/PATCH | `/passengers`, `/passengers/{id}` | admin | Search, block/unblock |
| GET/POST | `/dispatch-config` | admin_super | T_offer, max_zones, max_total_wait |

### Documents — `/v1/documents`
| POST | `/upload-url` | driver/admin | `{kind, mime}` → signed PUT URL + media_id |
| POST | `/{media_id}/finalize` | uploader | Verify sha256, trigger scan |
| GET | `/{media_id}` | owner/admin | Signed GET URL (time-limited) |

---

## 3. WebSocket Contracts

**Passenger/Driver — `wss://api.../v1/ws/rides`** (auth: JWT in `Sec-WebSocket-Protocol`)
```json
// server → client
{ "type": "ride.state", "ride_id": "…", "status": "assigned",
  "driver": { "name": "…", "plate_no": "…", "rating": 4.8 }, "eta_s": 240 }
{ "type": "driver.position", "ride_id": "…", "lat": …, "lon": …, "heading": … }  // every 3–5 s while active
{ "type": "ride.fare", "ride_id": "…", "total_paisa": 45000, "breakdown": { } }
// driver client additionally receives:
{ "type": "offer", "ride_id": "…", "pickup": {…}, "distance_to_pickup_m": 800, "expires_at": "…" }
{ "type": "offer.withdrawn", "ride_id": "…" }
```
Heartbeat ping/pong 25 s; reconnect with `Last-Event-Id` → server replays missed ride-state (not positions).
Fallback: `GET /v1/rides/{id}` polling every 5 s.

**Admin — `wss://api.../v1/ws/fleet`** (roles admin_*)
```json
{ "type": "fleet.positions", "vehicles": [ { "id": "…", "lat": …, "lon": …, "status": "free|on_trip|violating|stale" } ] } // 3 s batches
{ "type": "violation.opened", "violation": { … } }
{ "type": "sos", "ride_id": "…", "lat": …, "lon": … }
```

## 4. MQTT (tracker ingress — not client-facing)

- Topic `tracker/{device_id}/pos`, QoS 1, payload per tracker protocol adapter **[OPEN-4]**; normalized internally to `{device_id, lat, lon, speed, heading, ignition, ts, battery}`.
- EMQX auth: per-device username/password provisioned at vehicle onboarding; ACL restricts each device to its own topic.

## 5. Internal service APIs (examples, REST over cluster DNS)

- `GET tracking.itms.svc/internal/vehicles/free?zones=a,b,c` → dispatch eligibility list
- `POST fare.itms.svc/internal/calculate {ride_id, distance_m, duration_s, started_at, pickup_zone_id}`
- `GET geofence.itms.svc/internal/contains?zone_id=&lat=&lon=`
Internal paths are namespaced `/internal/*`, unauthenticated at network level but mTLS/NetworkPolicy-restricted (security.md §4).
