# Functional Specification — Electric Taxi Management System

**Doc:** `specs.md` · **Version:** 1.0 · **Status:** Baseline for build
**Sources:** PRD v1.0 (System Flow & Technical Design), SDD-ET-001 (Microservices Backend Architecture)

This document is the single functional source of truth. It expands the PRD into buildable,
testable requirements: user stories, flows, state machines, edge cases, and acceptance criteria.
Anything marked **[OPEN]** references `open-questions.md` and must not block scaffolding, but blocks release.

---

## 1. Actors & Personas

| Actor | Description | App |
|---|---|---|
| **Passenger** | Public rider booking a taxi from inside a service zone | Passenger App (Android/iOS) |
| **Driver** | Vetted driver assigned to one electric taxi | Driver App (Android) |
| **Admin** | iTecknologi / Sindh Govt operations staff | Admin Web Panel |
| **Supervisor** | Elevated admin handling violations & escalations | Admin Web Panel (role) |
| **Super Admin** | Full-control admin: user management, fare config, system settings | Admin Web Panel (role) |
| **Vehicle Tracker** | IoT GPS device installed in each taxi, reporting over MQTT/GSM | (machine actor) |

---

## 2. Feature Inventory (scope of v1)

### 2.1 Passenger App
- **P-01** Registration & login via phone number + OTP (SMS).
- **P-02** Profile: name, phone (verified), optional email.
- **P-03** Home map: auto-detect GPS location; show whether the passenger is inside a service zone.
- **P-04** Request ride: pickup auto-detected or manually pinned; destination pinned (destination required for routing/ETA, **not** for fare — no fare shown pre-ride).
- **P-05** No upfront fare estimate is displayed anywhere pre-ride (hard client requirement).
- **P-06** Live matching status: searching → driver assigned → arriving, with cancel option.
- **P-07** Live tracking of assigned driver (position, ETA) and of the trip in progress.
- **P-08** Ride cancellation before pickup (with reason selection); cancellation policy **[OPEN-6]**.
- **P-09** Post-ride fare display with breakdown (base + distance + time + adjustments).
- **P-10** Payment: Cash, JazzCash, Card; saved cards (tokenized via gateway).
- **P-11** Digital receipt (in-app + optional SMS link).
- **P-12** Ride history with receipts and GPS trail summary.
- **P-13** Rate driver (1–5 stars + optional comment) after ride.
- **P-14** Push notifications for every ride state change; SMS fallback for critical events.
- **P-15** SOS button during an active ride (calls configured emergency number + flags ride in Admin Panel).
- **P-16** Localization: English + Urdu (RTL-aware layout); Sindhi optional **[OPEN-7]**.

### 2.2 Driver App
- **D-01** Login via phone + OTP; device binding (one active device per driver).
- **D-02** Online/Offline toggle; drivers only receive requests while Online and not on a trip.
- **D-03** Receive ride request offer with pickup point, distance to pickup, and countdown timer; Accept/Reject.
- **D-04** Navigate to pickup (deep-link to Google Maps or in-app turn hints).
- **D-05** "Arrived" action → notifies passenger.
- **D-06** "Start Ride" — allowed only when driver GPS is within 150 m of pickup point (configurable) or with passenger-confirmed override.
- **D-07** "End Ride" — records end time/location; triggers fare calculation.
- **D-08** Fare screen after End Ride: shows computed fare & breakdown to collect from passenger.
- **D-09** Cash collection confirmation ("Cash received") for cash rides.
- **D-10** Earnings screen: per-day / per-week totals, per-ride list.
- **D-11** Geofence status indicator: inside paired zone (green) / outside zone warning (red banner + push).
- **D-12** Ride history and ratings received.
- **D-13** Background GPS: driver app reports position every 5–10 s while Online (supplements the vehicle tracker; the **vehicle tracker is authoritative** for fare/violation, driver app GPS is fallback).
- **D-14** Incoming ride offers must wake the app (FCM high-priority + full-screen intent on Android).
- **D-15** Localization: English + Urdu.

### 2.3 Admin Web Panel
- **A-01** Admin login (email + password + TOTP 2FA); roles: Super Admin, Supervisor, Operator (read-mostly).
- **A-02** Geofence management: draw polygon / circle zones on map, name, activate/deactivate, edit history.
- **A-03** Vehicle onboarding: plate no., tracker device ID, EV model; pair vehicle ↔ primary geofence zone.
- **A-04** Driver onboarding: profile, license, CNIC, document upload & verification workflow (pending → approved → rejected), assign driver ↔ vehicle.
- **A-05** Passenger management: search, view rides, block/unblock.
- **A-06** Live fleet map: all vehicles, color-coded by status (free / on-trip / offline / violating).
- **A-07** Ride monitoring: live rides list, ride detail with GPS trail replay.
- **A-08** Fare configuration: base fare, per-km rate, per-minute rate, per-zone overrides, effective-from date; full change audit log. Formula values **[OPEN-1]**.
- **A-09** Violation center: live violation alerts, acknowledgment, resolution notes, escalation actions (warn / notify supervisor / suspend driver) per policy **[OPEN-5]**.
- **A-10** Dispatch configuration: matching window seconds, max expansion zones, driver offer timeout.
- **A-11** Reports: rides per zone/day, revenue by payment method, driver performance, violation summary, fleet utilization; CSV export.
- **A-12** Notification broadcast: push announcement to all drivers or all passengers.
- **A-13** Audit log of every admin action (who, what, when, before/after values).

### 2.4 Platform / Backend (cross-cutting)
- **B-01** GPS ingestion from vehicle trackers (MQTT), 5–10 s cadence, ≥ 500 vehicles headroom.
- **B-02** Geofence containment checks on every position update, with hysteresis (see §6.3).
- **B-03** Dispatch: 3-nearest-zone broadcast + zone expansion (see §5).
- **B-04** Fare engine: versioned, admin-configurable formula (see §7).
- **B-05** Payments: Cash / JazzCash / Card incl. failure & retry flows (see §8).
- **B-06** Notifications: FCM push + SMS gateway, template-driven.
- **B-07** Ratings (both directions: passenger→driver required in v1; driver→passenger optional flag only).
- **B-08** Full audit trail: rides, GPS trails, violations, payments, admin actions.

### Out of scope for v1 (explicitly)
- Scheduled/advance bookings, ride pooling/sharing, promotions & coupons,
  driver wallets/settlement automation, in-app chat/VoIP (masked phone call only),
  corporate accounts, multi-city tenancy.

---

## 3. Ride Lifecycle — State Machine

The Ride Service owns this state machine. It expands the SDD's four states to cover
cancellation, matching failure, and payment outcomes.

```
                         ┌────────────┐
                         │ REQUESTED  │  passenger submits request
                         └─────┬──────┘
                               ▼
                         ┌────────────┐   expansion exhausted   ┌──────────────────┐
                         │  MATCHING  ├────────────────────────▶│ NO_DRIVER_FOUND  │ (terminal)
                         └─────┬──────┘                         └──────────────────┘
                 driver accepts│        passenger cancels ──▶ CANCELLED_BY_PASSENGER (terminal)
                               ▼
                         ┌────────────┐  driver cancels ──▶ reoffer → MATCHING (once) or CANCELLED_BY_DRIVER
                         │  ASSIGNED  │
                         └─────┬──────┘  passenger cancels ──▶ CANCELLED_BY_PASSENGER
                driver arrives ▼
                         ┌────────────┐
                         │  ARRIVING  │  (driver tapped "Arrived")
                         └─────┬──────┘
              driver starts    ▼   no-show timeout ──▶ CANCELLED_NO_SHOW
                         ┌────────────┐
                         │IN_PROGRESS │  t0 recorded, distance = 0
                         └─────┬──────┘
                driver ends    ▼
                         ┌─────────────────┐
                         │ PENDING_PAYMENT │  fare computed & shown
                         └─────┬───────────┘
            payment confirmed  ▼          payment fails ──▶ PAYMENT_FAILED ──▶ retry / switch to cash
                         ┌────────────┐                                        └─▶ PENDING_PAYMENT
                         │ COMPLETED  │  (terminal) receipt issued
                         └────────────┘
```

**Transition rules**

| From | To | Trigger | Guards |
|---|---|---|---|
| REQUESTED | MATCHING | dispatch engine picks up request | pickup inside an active zone |
| MATCHING | ASSIGNED | first driver Accept wins | driver still Online & free (atomic lock, see §5.4) |
| MATCHING | NO_DRIVER_FOUND | expansion limit reached, no acceptance | — |
| MATCHING / ASSIGNED / ARRIVING | CANCELLED_BY_PASSENGER | passenger cancels | cancellation policy **[OPEN-6]** |
| ASSIGNED / ARRIVING | MATCHING | driver cancels before pickup | max 1 automatic re-match, then NO_DRIVER_FOUND path |
| ARRIVING | CANCELLED_NO_SHOW | driver reports no-show after ≥ 5 min waiting at pickup (configurable) | driver GPS within 150 m of pickup |
| ARRIVING | IN_PROGRESS | driver taps Start Ride | driver GPS within 150 m of pickup (configurable) |
| IN_PROGRESS | PENDING_PAYMENT | driver taps End Ride | fare engine returns fare |
| PENDING_PAYMENT | COMPLETED | payment success event | JazzCash/card confirmed, or driver confirms cash |
| PENDING_PAYMENT | PAYMENT_FAILED | gateway declines / timeout | — |
| PAYMENT_FAILED | PENDING_PAYMENT | passenger retries or switches method (incl. fallback to cash) | max 3 digital retries, then cash-only |

**Invariants**
- Exactly one active (non-terminal, pre-COMPLETED) ride per passenger and per driver at a time.
- A ride is never deleted; terminal rides are immutable except payment reconciliation fields.
- Every transition is timestamped, actor-attributed, and published as a domain event.

---

## 4. Ride Request Flow (detailed)

1. Passenger opens app → app sends current GPS → backend responds with `inServiceZone: true/false` (+ zone id).
2. If outside all active zones: booking UI disabled with message "Service not available at your location."
3. Passenger sets pickup (auto/pin) and destination pin. **No fare estimate is requested or rendered.**
4. `POST /rides` creates ride in `REQUESTED`; passenger sees "Finding your driver…".
5. Dispatch flow (§5) runs. On assignment, passenger receives driver name, photo, plate no., vehicle model, live position, ETA.
6. Statuses stream to both apps over WebSocket (fallback: polling every 5 s).

---

## 5. Dispatch & Matching Specification

### 5.1 Zone selection
- Compute straight-line (geodesic) distance from pickup point to each **active** zone (distance to polygon boundary; 0 if inside).
- Take the **3 nearest zones** (the passenger's own zone counts and will typically be among them, distance 0).

### 5.2 Offer broadcast (Round 1)
- Eligible drivers: `status = Online`, no active ride, vehicle paired to one of the selected zones, vehicle tracker healthy (last ping < 60 s).
- All eligible drivers receive the offer **simultaneously** (FCM high-priority + WebSocket), showing pickup point and distance-to-pickup.
- Offer window: **T_offer = 15 s** (admin-configurable, A-10).

### 5.3 Zone expansion (Rounds 2+)
- If no acceptance within T_offer: add the **next nearest zone** and re-broadcast to newly eligible drivers (previous zones remain eligible).
- Repeat, one zone per round, until acceptance OR `max_zones` (default 6) OR `max_total_wait` (default 90 s) — both admin-configurable.
- On exhaustion: ride → `NO_DRIVER_FOUND`; passenger gets "No driver available right now" with a Retry action.

### 5.4 Acceptance race (first-accept-wins, exactly once)
- Acceptance is an atomic claim in Redis (`SET ride:{id}:claim driver:{id} NX PX 5000`) followed by durable assignment in the Ride Service.
- Losers receive instant "offer withdrawn". If the winner's durable assignment fails (crash), the claim TTL expires and the round re-opens.
- **Durability:** every dispatch round (ride id, zones, offered driver ids, timestamps) is journaled to the Ride Service DB via the outbox (architecture §6). Redis holds only live matching state; on Redis loss, in-flight matches restart from `ride.requested` events — a ride request is never silently lost.

### 5.5 Fairness / ranking (v1 behavior, documented decision)
- v1 keeps the client-specified pure broadcast (first tap wins). The offer screen shows distance-to-pickup so drivers self-select sensibly.
- v1.1 candidate improvement (backlog): stagger offers by driver distance rank (0 s / 3 s / 6 s tiers) to bias toward nearest drivers without changing the accept UX.

---

## 6. Geofencing & Violation Specification

### 6.1 Zone definition
- Zones are polygons (preferred) or circles, drawn in the Admin Panel, stored as PostGIS geometries (SRID 4326).
- Zones have: name, status (active/inactive), created/updated audit, optional per-zone fare overrides (§7).
- Zone edits are versioned; edits do not retro-affect past rides or violations.

### 6.2 Vehicle pairing
- Each vehicle has exactly **one primary zone**. Reassignment is an admin action (audited) and takes effect immediately.
- A vehicle may accept rides originating in any zone it was offered under dispatch expansion; the trip itself is an authorized activity anywhere (see 6.4).

### 6.3 Containment check with hysteresis (anti-false-positive)
- Every tracker ping is checked against the paired zone (PostGIS `ST_Contains` on the live check path uses Redis-cached zone geometry; source of truth PostGIS).
- A vehicle is flagged **outside** only when BOTH: distance outside boundary > **75 m** AND condition persists > **120 s** (both configurable). This absorbs GPS drift and boundary-hugging.
- Re-entry clears the pending flag if within the dwell window.

### 6.4 Authorized-activity check
When a confirmed outside-zone condition exists, the system checks, in order:
1. Active ride (ASSIGNED → PENDING_PAYMENT) involving this vehicle → **authorized** (includes en-route-to-pickup in another zone).
2. Post-ride return window: ≤ **20 min** (configurable) after a ride ended outside the paired zone → **authorized** (returning home).
3. Admin-approved reassignment or maintenance pass (admin can grant a time-boxed "movement pass") → **authorized**.
4. Otherwise → **violation opened**.

### 6.5 Violation lifecycle
```
OPEN ──(vehicle re-enters zone)──▶ AUTO_CLOSED
OPEN ──(admin acknowledges)──▶ ACKNOWLEDGED ──(admin resolves w/ note)──▶ RESOLVED
OPEN ──(policy threshold)──▶ ESCALATED  [notify supervisor / suspend driver — policy OPEN-5]
```
- Violation record: vehicle, driver (if bound), zone, open/close timestamps, max distance outside, GPS trail slice, duration.
- Alerts: Admin Panel real-time banner + optional driver push warning ("Return to your assigned zone").

---

## 7. Fare Engine Specification

### 7.1 Formula (structure fixed now; values [OPEN-1])
```
fare = base_fare
     + per_km_rate     × distance_km
     + per_minute_rate × duration_min
     + adjustments      (zone override delta, night factor, waiting charge — each optional, default off)
fare = max(fare, minimum_fare)
fare = round to nearest PKR 10 (configurable rounding rule)
```
- **distance_km**: sum of segment distances over the vehicle-tracker GPS trail between Start Ride and End Ride, with outlier filtering (drop points implying speed > 140 km/h; gap-fill by straight line). Driver-app GPS is fallback if tracker gap > 60 s.
- **duration_min**: `t_end − t_start` wall clock.

### 7.2 Configuration & versioning
- Fare configs are **versioned rows** with `effective_from`; a ride uses the config active at its **start** time. Configs are never edited in place — a change creates a new version (full audit).
- Per-zone override: optional multiplier or replacement rates keyed by the **pickup zone**.
- All values editable in Admin Panel by Super Admin only; changes take effect without deployment.

### 7.3 Rules
- Fare is computed **only after End Ride** — never exposed to the passenger before or during the trip (client hard requirement).
- Receipt must show the full breakdown: base, distance component (km × rate), time component (min × rate), adjustments, rounding.
- Disputed fares: admin can adjust fare on a COMPLETED ride ≤ 72 h post-ride (creates a `fare_adjustment` record + optional refund flow, audited).

---

## 8. Payments Specification

### 8.1 Methods & flows

| Method | Flow | Failure handling |
|---|---|---|
| **Cash** | Driver collects; taps "Cash received" → ride COMPLETED. | If driver disputes/forgets: ride stays PENDING_PAYMENT; auto-reminder to driver at 10 min; admin can force-resolve. |
| **JazzCash** | Passenger taps Pay → backend creates JazzCash transaction → wallet MWALLET/OTP flow → gateway callback confirms → COMPLETED. | Decline/timeout → PAYMENT_FAILED → retry (max 3) or switch method (incl. cash). Callback verification is mandatory (server-to-server, signature-checked); client-side success alone never completes a ride. |
| **Card** | Passenger pays via 1LINK-compliant gateway (hosted checkout / tokenized card) → auth+capture at ride end → COMPLETED. | Same retry/switch policy. Card data never touches our servers (see security.md §PCI). |

### 8.2 Integrity rules
- **Idempotency:** every payment attempt carries an idempotency key `pay:{ride_id}:{attempt_n}`; gateway callbacks are deduplicated on transaction reference. A ride can never accumulate two successful payments — a second success auto-triggers a refund task + alert.
- **Reconciliation:** daily job compares gateway settlement reports vs `payments` table; mismatches surface in the Admin violation/finance queue.
- **Unpaid rides:** if PENDING_PAYMENT > 30 min with a digital method, the ride auto-falls back to "collect cash" driver instruction; if unresolved > 24 h it is flagged `unsettled` for admin action. Passenger cannot book a new ride while owing an unsettled fare (configurable).
- **Refunds:** admin-initiated only in v1, through the gateway, recorded as `payment` rows with negative amount and linked reference.

---

## 9. Tracking Specification

- **Ingestion:** vehicle trackers publish over MQTT (topic `tracker/{deviceId}/pos`) at 5–10 s cadence: lat, lon, speed, heading, ignition, timestamp, device battery. Protocol adapter per tracker model **[OPEN-4]**.
- **Live layer:** Redis GEO set per status (`vehicles:free`, `vehicles:ontrip`) + hash per vehicle with last ping; powers dispatch and admin live map.
- **History:** every ping persisted to TimescaleDB hypertable (`gps_logs`), retention 18 months hot, then archived to object storage (parquet) **[retention OPEN-8]**.
- **Health:** vehicle with no ping > 60 s → `tracker_stale` (excluded from dispatch); > 10 min → alert in Admin Panel.
- **Trip trail:** on ride start/end, trail slice is bound to the ride for replay, fare, and disputes.
- **Driver-app GPS:** secondary stream, same pipeline, tagged `source=driver_app`; used when tracker is stale and for driver-position display pre-pickup.

---

## 10. Notifications Matrix (v1)

| Event | Passenger | Driver | Admin |
|---|---|---|---|
| Ride requested | — (in-app state) | Offer push (high priority) | — |
| Driver assigned | Push + in-app | In-app confirm | — |
| Driver arrived | Push + SMS | — | — |
| Ride started / ended | In-app | In-app | — |
| Fare ready | Push + in-app | In-app | — |
| Payment success | Push + receipt SMS (opt) | In-app | — |
| Payment failed | Push | In-app | Finance queue |
| Ride cancelled (any) | Push | Push | — |
| No driver found | Push | — | Metric/alert on rate |
| Geofence violation | — | Warning push (optional per policy) | Real-time banner + list |
| Driver document expiring | — | Push (7 days before) | List |
| SOS triggered | — | — | Critical alert + sound |

All templates bilingual (EN/UR), managed in Notification Service, editable without deploy.

---

## 11. Non-Functional Requirements (measurable)

| # | Requirement | Target |
|---|---|---|
| N-01 | GPS ingestion capacity | 500 vehicles × 1 ping/5 s = 100 msg/s sustained; burst 5× |
| N-02 | Position update end-to-end latency (tracker → admin map) | p95 < 3 s |
| N-03 | Dispatch: request → first offers broadcast | p95 < 2 s |
| N-04 | API latency (gateway, non-geo reads) | p95 < 300 ms |
| N-05 | Availability, ride-critical path (gateway, dispatch, ride, tracking) | 99.5 % monthly (v1) |
| N-06 | Fare computation after End Ride | p95 < 2 s |
| N-07 | Push delivery (FCM accepted) | p95 < 2 s from event |
| N-08 | Data durability | No committed ride/payment/violation record may be lost (RPO ≤ 5 min, see devops.md) |
| N-09 | Security | See security.md — JWT everywhere, TLS 1.2+, encryption at rest, full audit trail |
| N-10 | Apps | Passenger app cold start < 3 s on mid-range Android; offline-tolerant driver app (queue actions, §D-13/D-14) |
| N-11 | Scalability | Architecture must scale to 2,000 vehicles / 3 cities without redesign (horizontal scaling only) |

---

## 12. Acceptance Criteria (release gates per module)

- **Ride happy path:** request → match → pickup → trip → fare → each payment method → receipt, verified end-to-end on real devices with a real GPS tracker in a moving vehicle.
- **Dispatch:** demonstrable 3-zone broadcast, expansion to 4th+ zone, exhaustion fallback, and race-safe single assignment under concurrent accepts (automated test with 50 simulated drivers).
- **Geofence:** boundary-drift simulation produces zero false violations with hysteresis on; genuine excursion produces exactly one violation with correct trail.
- **Fare:** golden-file tests for formula versions; config change in Admin reflects on next ride without deploy.
- **Payments:** sandbox JazzCash + card success, decline, timeout, duplicate-callback, and refund paths all green; reconciliation job matches sandbox settlement file.
- **Load:** N-01…N-06 targets met in a load test at 2× pilot fleet size.
- **Security:** pen-test findings ≥ high severity closed; OWASP ASVS L1 checklist passed (security.md).
