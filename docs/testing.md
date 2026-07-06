# Testing & QA Strategy

**Doc:** `testing.md` · **Version:** 1.0 · **Status:** Baseline for build
**Principle:** the release gates in `specs.md §12` are the definition of done; this doc defines how each is proven.

---

## 1. Test Pyramid & Ownership

| Layer | Tooling | Coverage target | Runs |
|---|---|---|---|
| Unit (backend) | Jest (Nx per service) | 80% on domain logic: fare engine, state machine, dispatch rounds, geofence hysteresis | every PR |
| Unit/widget (Flutter) | flutter_test, golden tests (incl. `LiquidGlass` renders, RTL snapshots) | critical widgets + all state screens | every PR |
| Contract | OpenAPI schema validation + event-envelope contract tests (producer/consumer against `data-model.md` catalog) | every API & event | every PR |
| Integration (service + real deps) | Jest + Testcontainers (Postgres/PostGIS/Timescale, Redis, RabbitMQ, EMQX) | per-service happy + failure paths | every PR (affected) |
| End-to-end (cluster) | Playwright (admin) + Flutter integration_test + **simulator harness** | the 12 core scenarios (§2) | nightly on dev, gate on staging |
| Load/perf | k6 (API) + custom MQTT flooder | NFR table specs §11 | weekly on staging + pre-release |
| Security | see security.md §7 | — | CI + scheduled |
| Field/UAT | manual scripts + pilot protocol (§5) | — | phase gates |

**Test data & simulation backbone (build early, Phase 0–1):**
- **GPS simulator**: replays configurable routes (CSV/GPX) for N virtual vehicles over MQTT with drift/noise injection, speed profiles, and signal-gap injection. This single tool powers dispatch tests, geofence tests, fare determinism tests, load tests, and demos.
- **Actor bots**: scripted passenger/driver API clients for concurrency scenarios.
- Seeded fixture set: 6 zones (adjacent, overlapping-boundary cases), 50 vehicles, 60 drivers, fare config v1.

## 2. Core E2E Scenarios (automated, run nightly)

1. Happy path: request → 3-zone broadcast → accept → arrive → start → trip (simulated route) → end → fare correct vs golden value → cash confirm → COMPLETED + receipt + rating.
2. Digital payments: JazzCash sandbox success / decline→retry→success / decline×3→switch to cash. Card same. Duplicate gateway callback → single payment (idempotency proof).
3. Dispatch race: 50 driver bots accept simultaneously → exactly one ASSIGNED, others get withdrawn; journal consistent.
4. Zone expansion: no drivers in 3 zones → round 2 → round 3 → acceptance in zone 5; timing within config.
5. Exhaustion: no drivers anywhere → NO_DRIVER_FOUND at max_total_wait; passenger notified.
6. Cancellations: passenger cancel in MATCHING/ASSIGNED/ARRIVING; driver cancel → single auto re-match; no-show flow with proximity guard.
7. Geofence: boundary-hugging route with GPS noise → **zero violations** (hysteresis); genuine excursion → exactly one violation, correct trail, auto-close on re-entry; active-ride excursion → no violation; return-window → no violation; movement pass → no violation.
8. Fare determinism: same trail + same config version → identical fare across 100 runs; config v2 mid-day → rides started before/after use correct versions.
9. Tracker resilience: tracker silent mid-ride → driver-app GPS fallback in fare; stale vehicle excluded from dispatch.
10. Saga faults: kill Fare service after End Ride → ride enters FARE_ERROR path, recovers on service restart (outbox replay); kill Payment mid-callback → no double state.
11. WebSocket: state stream correctness incl. reconnect replay; polling fallback parity.
12. Admin: zone draw→pair→dispatch respects new zone; fare config change without deploy; violation ack/resolve; audit log entries for each.

## 3. Load & Performance (staging, k6 + MQTT flooder)

| Test | Load | Pass criteria (specs §11) |
|---|---|---|
| GPS ingest soak | 1,000 virtual vehicles × 5 s pings, 2 h | no lag growth; p95 ingest→map < 3 s (N-01/02) |
| Dispatch burst | 100 ride requests/min, 10 min | p95 request→offers < 2 s; zero lost requests (N-03) |
| Mixed API | 300 RPS blended profile | p95 < 300 ms, error rate < 0.5% (N-04) |
| Payment surge | 50 concurrent PENDING_PAYMENT completions | no dupes, p95 fare < 2 s (N-06) |
| WS fan-out | 1,000 concurrent app sockets + admin map | update latency p95 < 3 s |
| Chaos (staging) | kill one replica of each service under load; kill Redis master | no SEV-1 behavior: rides recover, no data loss |

## 4. Mobile Device & App QA

- Device matrix: low-end Android (2–3 GB RAM, Android 10), mid (Android 12–14), flagship; iPhone SE + recent iOS. **Glass fallback path verified on low-end (60 fps or auto-degrade per ui-ux §6).**
- Driver-app specials: background GPS continuity (screen off, battery saver, Doze), offer full-screen intent from killed state, offline action queue (start/end ride buffered through a signal gap and reconciled), battery drain budget ≤ 8%/hour online.
- Localization QA: full Urdu RTL pass per release; truncation/overflow snapshots.
- Accessibility audit per ui-ux §8 (axe/Stark + TalkBack scripts).
- App release gate: crash-free sessions ≥ 99.5% on internal track before promotion.

## 5. UAT & Pilot Field Protocol (Phase 3–4)

1. **Bench UAT (staging):** client walks scripted scenarios (booking, payments, violations, reports) — sign-off required.
2. **Closed field trial:** 5–10 real vehicles with production trackers, staff-only passengers, 2 weeks. Daily triage; exit criteria: 50 clean E2E rides incl. ≥10 JazzCash + ≥10 card, zero unresolved SEV-1/2.
3. **Pilot launch:** limited zones/public per roadmap; monitored KPIs: match rate > 80%, payment success > 95%, violation false-positive < 2%, crash-free > 99.5%.

## 6. Defect policy

SEV-1 (safety/money/data loss): fix before any release, postmortem. SEV-2 (core degraded): blocks release train. SEV-3/4: prioritized backlog. Every SEV-1/2 gets a regression test before close.
