# Delivery Roadmap — 0 → Production

**Doc:** `roadmap.md` · **Version:** 1.0 · **Status:** Baseline for build
**Constraints:** 12 microservices (client requirement) · Flutter apps + Next.js admin · team 3–5 devs · target **4–6 months** to production pilot.

---

## 0. Honest risk statement (read first)

Twelve independently deployable services with a 3–5 person team in 4–6 months is **aggressive**.
It is achievable only with the mitigations this plan bakes in:

1. **One Nx monorepo, one uniform service template** — 12 deployables, but one codebase discipline (techstack §2).
2. **Shared platform libs** (auth, outbox/event bus, observability, errors) built once in Phase 0.
3. **Strict v1 scope** — the out-of-scope list in specs §2 is a wall, not a suggestion.
4. **Simulator-first testing** (testing §1) — no dependency on hardware availability for development.
5. **Pending client inputs tracked as blockers with dates** (open-questions.md) — the #1 schedule risk is not code, it is **[OPEN-1..5]** arriving late.

If any of: fare formula, zone list, JazzCash/gateway credentials, or tracker protocol slip past **week 8**, the timeline shifts week-for-week. This is stated here so it is nobody's surprise later.

## 1. Team shape (5 people; degrades to 4/3 by stretching phases)

| Role | Focus |
|---|---|
| **BE-1** (lead/architect) | Platform libs, gateway, Auth, Ride, Dispatch, saga |
| **BE-2** | Tracking, Geofence, Fare, Payment, Notification, Reporting, Document |
| **MOB-1** | Passenger app + shared Flutter design system |
| **MOB-2** | Driver app (+ helps passenger app in Phase 2) |
| **FS-1** | Admin panel + DevOps/CI/K8s (with BE-1) + QA automation |
| External/part-time | UI/UX designer (Phases 0–2), pen-tester (Phase 3), QA support during UAT |

## 2. Phases (24 weeks nominal; ±2 weeks buffer noted per phase)

### Phase 0 — Foundations (weeks 1–2)
Repo/Nx workspace, service template, shared libs (JWT, outbox, event client, OTel, errors), Docker Compose local stack, CI pipelines, dev cluster, seed scripts, **GPS simulator v0**; Figma tokens + wireframe kickoff (ui-ux §7); finalize `open-questions.md` owners & due dates with client.
**Exit:** template service deployed to dev via pipeline; simulator streams into a stub Tracking service; wireframes in progress.

### Phase 1 — Ride core (weeks 3–8)
- **Backend:** Auth (OTP/JWT/devices) → Passenger, Driver services → Tracking (MQTT→Redis GEO→Timescale) → Geofence (zones, pairing, containment+hysteresis) → Ride (state machine, outbox, WS) → Dispatch (rounds, expansion, atomic accept).
- **Mobile:** design system + `LiquidGlass` kit from signed-off Figma (week 4 gate); passenger booking flow; driver online/offer/trip flow.
- **Admin:** shell + auth/RBAC, zone editor, vehicle/driver onboarding, live fleet map v1.
**Exit (Gate G1, ~wk 8):** simulated E2E ride — request→match→trip→end — across real services on dev, watched live in admin map. *Buffer +1 wk.*

### Phase 2 — Money, comms, hardening of flows (weeks 9–14)
- **Backend:** Fare (versioned configs, engine), Payment (JazzCash + card sandbox, idempotency, callbacks, cash flow), completion saga, Notification (FCM/SMS, EN/UR templates), Document/Media (uploads, receipts), Reporting projections v1.
- **Mobile:** fare/payment/receipt/rating screens; driver fare-collection; violations warning banner; history/earnings; Urdu localization pass.
- **Admin:** fare config UI, violation center, ride monitor + trail replay, reports v1, audit log.
**Exit (Gate G2, ~wk 14):** full E2E incl. all three payment methods (sandbox) + violation lifecycle demoed on staging; the 12 automated E2E scenarios (testing §2) green. *Buffer +1 wk.*

### Phase 3 — Production hardening (weeks 15–18)
Load tests to NFR targets + fixes; chaos drills; runbooks; staging→production infra (per **[OPEN-2]** decision, needed ≤ wk 14); backups + restore drill; pen test + remediation; app store submissions (internal/closed tracks); bench UAT with client; real tracker integration end-to-end (2–3 devices) **[OPEN-4 hardware needed ≤ wk 12]**.
**Exit (Gate G3):** specs §12 release gates all green; client UAT sign-off; production cluster live.

### Phase 4 — Field trial → pilot launch (weeks 19–24)
- Wks 19–20: **closed field trial** (5–10 vehicles, staff passengers, production JazzCash/card credentials) — daily triage.
- Wks 21–22: fixes, ops rehearsal (on-call, incident drill), driver training material, store production approval.
- Wks 23–24: **public pilot launch** in initial zones; hypercare (daily KPI review: match rate > 80%, payment success > 95%, violation false-positive < 2%, crash-free > 99.5%).
**Exit:** pilot stable 2 weeks against KPIs → project moves to run/scale mode.

### Post-v1 backlog (explicitly deferred)
Ranked-offer dispatch (specs §5.5), driver settlement/wallet automation, promotions, scheduled rides, Sindhi locale, Kafka migration if triggered, multi-city rollout, advanced fraud detection, in-app chat.

## 3. Milestone → deliverable map

| Gate | Week | Demoable deliverable |
|---|---|---|
| G0 | 2 | Pipeline-deployed template svc + simulator + wireframes |
| G1 | 8 | Live simulated ride E2E on dev + admin live map |
| G2 | 14 | Full product on staging: payments, violations, reports, both apps, Urdu |
| G3 | 18 | Production-ready: load/pen/UAT passed, stores approved (closed track) |
| G4 | 20 | Field-trial exit: 50 clean real rides |
| **Launch** | 23–24 | Public pilot live |

## 4. Top risks & mitigations

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | Client inputs late (fare, zones, credentials, tracker spec) | **High** | Dated owners in open-questions.md; scaffolds built config-first so values drop in late — but hard deadline wk 8/12 flagged above |
| R2 | 12-service overhead drags a small team | High | Monorepo+template+shared libs; no gRPC/Kafka/mesh gold-plating in v1; FS-1 dedicates 30% to DevEx |
| R3 | JazzCash/1LINK integration friction (sandbox quality, cert cycles) | Medium-High | Start integration at wk 9 with stub-first adapter; cash path always shippable independently |
| R4 | Background GPS / offer reliability on Android OEMs | Medium | D-13/D-14 patterns + device-matrix testing from Phase 1; vehicle tracker is authoritative anyway |
| R5 | Glassmorphism perf on low-end devices | Medium | ui-ux §6 guardrails + auto-fallback; golden perf test in device QA |
| R6 | No-upfront-fare UX causes disputes at scale | Medium | Receipt transparency, fare-adjustment tooling (specs §7.3), pilot KPI watch; product decision documented |
| R7 | Hosting decision late → infra rework | Medium | Cloud-agnostic K8s design; decision deadline wk 14 |
| R8 | Team member loss (bus factor) | Medium | Monorepo uniformity, docs-as-code, pairing on Ride/Dispatch (the two hardest services) |

## 5. Client-facing cadence

Weekly demo + status vs gates · risk register review bi-weekly · gate sign-offs (G1–G4) are formal client approvals · change requests priced against the out-of-scope wall (specs §2).
