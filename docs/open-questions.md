# Open Questions — Pending Client / Stakeholder Inputs

**Doc:** `open-questions.md` · **Version:** 1.0 · **Status:** Living document — review weekly
Each item lists what is blocked and the **latest date** it can arrive without moving the launch (per roadmap §2/§4-R1).

| ID | Question / needed input | Blocks | Owner | Needed by | Status |
|---|---|---|---|---|---|
| **OPEN-1** | Exact fare formula values: base fare, per-km, per-minute, minimum fare, rounding rule, any night/zone multipliers | Fare config v1 seed; receipt copy; UAT fare golden values (engine itself is built config-first and is NOT blocked) | Client (Sindh Govt) | **Week 12** | ⬜ Pending |
| **OPEN-2** | Hosting & data-residency ruling: in-country VMs vs international cloud; DC/provider selection | Production infra provisioning (Phase 3); backup replication target; procurement lead time | Client + iTecknologi legal | **Week 14** | ⬜ Pending |
| **OPEN-3** | JazzCash merchant account + API credentials (sandbox → production); 1LINK-compliant card gateway selection & contract; SMS gateway account | Payment integration beyond stubs (wk 9); field trial needs production credentials (wk 19) | Client finance + iTecknologi | Sandbox **wk 9**, production **wk 18** | ⬜ Pending |
| **OPEN-4** | Vehicle tracker hardware spec: model, protocol/payload format, provisioning process; 2–3 test devices | Protocol adapter; real-device E2E (wk 15+). Dev proceeds on simulator | Client / hardware vendor | Spec **wk 8**, devices **wk 12** | ⬜ Pending |
| **OPEN-5** | Violation escalation policy: warning thresholds, suspension rules (auto vs manual), supervisor notification matrix | Escalation automation & driver-suspension rules (violation detection/alerting NOT blocked) | Client operations | **Week 12** | ⬜ Pending |
| **OPEN-6** | Passenger cancellation policy: free-cancel window, fee (if any — note: fee collection pre-ride conflicts with no-upfront-fare; recommend no fee in v1) | Cancellation UX copy + any fee logic | Client + product | **Week 10** | ⬜ Pending — recommendation: no fee in v1 |
| **OPEN-7** | Sindhi localization required for v1? | Locale scope; template authoring | Client | **Week 10** | ⬜ Pending — plan assumes EN+UR only |
| **OPEN-8** | Data retention policy: GPS raw history (plan assumes 18 mo hot + archive), ride/payment fiscal retention | Timescale retention jobs; archive automation | Client legal | **Week 14** | ⬜ Pending |
| **OPEN-9** | Privacy policy & consent text (Urdu+English); passenger data-deletion policy approval | Store listings (need privacy policy URL, wk 15); anonymization behavior | Client legal | **Week 13** | ⬜ Pending |
| **OPEN-10** | Pen-test budget/vendor; post-launch support & on-call staffing model (24/7 vs business hours) | Phase 3 pen test booking; run-mode cost plan | iTecknologi mgmt | **Week 12** | ⬜ Pending |
| **OPEN-11** | Initial launch zones: list + boundaries (GeoJSON or map markup) for the pilot | Zone seeding for staging/UAT & pilot config (zone tooling NOT blocked) | Client | **Week 14** | ⬜ Pending |
| **OPEN-12** | Branding pack: logo, app names, store listing assets; confirmation of green/teal palette in ui-ux.md | Store submissions (wk 15); final theming | Client comms | **Week 12** | ⬜ Pending |
| **OPEN-13** | SOS routing: which emergency/control-room number(s); is a govt control-room integration required? | SOS action target (button UX NOT blocked) | Client operations | **Week 12** | ⬜ Pending |
| **OPEN-14** | Driver→passenger masked calling: provider for number masking, or direct call acceptable for v1? | Call feature wiring | iTecknologi + client | **Week 10** | ⬜ Pending — plan assumes direct call v1 |

## Process

- Reviewed in the weekly client demo; every item has an owner and a dated deadline.
- An item crossing its "Needed by" date triggers a formal schedule-impact note (roadmap §0).
- Resolved items move to a "Decisions" section below with the answer recorded verbatim.

## Decisions (log)

| Date | ID | Decision |
|---|---|---|
| 2026-07-06 | — | Architecture: full 12 microservices per SDD (client choice); mitigations in roadmap §0 |
| 2026-07-06 | — | Mobile: Flutter for both passenger and driver apps |
| 2026-07-06 | — | Hosting: undecided — docs kept cloud-agnostic (see OPEN-2) |
| 2026-07-06 | — | Team/timeline: 3–5 devs, 4–6 months to production pilot |
| 2026-07-06 | — | UI identity: glassmorphic / liquid-glass design language (ui-ux.md) |
