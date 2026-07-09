# Electric Taxi Management System (ITMS)

Ride-hailing platform for the **Sindh Government Electric Taxi Initiative**, built by iTecknologi Group.
Electric taxis operate inside admin-defined geo-fenced zones; passengers book rides with no upfront fare,
fare is computed post-ride from GPS-measured time and distance, and every vehicle is continuously
tracked and validated against its paired geofence.

## Status

| Component | Status |
|---|---|
| Backend — 12 microservices | ✅ Built, unit-tested, dockerized, verified end-to-end (`npm run e2e:smoke`) |
| Admin Web Panel (Next.js) | ✅ Built, verified against the real backend |
| Passenger App (Flutter) | ✅ Built, verified end-to-end against the real backend (web target — no Android/iOS device tested yet) |
| Driver App (Flutter) | ✅ Built, verified end-to-end against the real backend (web target — no Android/iOS device tested yet) |
| Kubernetes/Helm/Kong manifests | ⏳ Not started — `docker-compose` is the local/dev deployment today |

## Quick start (run the whole system)

**Prerequisites:** Docker + Docker Compose, Node.js 20, `openssl`.

```bash
npm install
cp .env.example .env
npm run keys:gen                              # generate a local JWT keypair

npm run infra:up                              # builds & starts infra + all 12 services + admin panel
npm run migrate:all                           # applies every service's DB migrations

ADMIN_BOOTSTRAP_EMAIL=admin@itms.example \
ADMIN_BOOTSTRAP_PASSWORD='change-me-please' \
npm run bootstrap:admin                       # creates the first Super Admin login + TOTP secret

open http://localhost:3100                    # Admin Panel — sign in with the account above
```

`bootstrap:admin` prints an `otpauth://` URI — scan it into an authenticator app (Google
Authenticator, 1Password, Authy) to get your 6-digit codes. It's shown once; re-run the
Auth service's migrations/bootstrap or query `auth_db.users` directly if you lose it.

Run `npm run e2e:smoke` (see [Verifying it actually works](#verifying-it-actually-works) below)
to prove the full ride → fare → payment flow works end-to-end against the running stack.

## Platform components

| Component | Technology | Path |
|---|---|---|
| Passenger App (Android + iOS) | Flutter | `apps/passenger` |
| Driver App (Android) | Flutter | `apps/driver` |
| Admin Web Panel | Next.js (React) | `apps/admin` |
| Backend (12 microservices) | NestJS monorepo | `services/*` |
| Shared libraries | TypeScript | `libs/*` |
| Infrastructure | Docker Compose (K8s/Terraform planned) | `infra/` |

## Documentation index

All planning and design documents live in [`docs/`](docs/):

| Document | Purpose |
|---|---|
| [specs.md](docs/specs.md) | Full functional specification — every feature, flow, state machine, and acceptance criteria |
| [techstack.md](docs/techstack.md) | Committed technology choices with rationale |
| [architecture.md](docs/architecture.md) | Microservices architecture, event bus, consistency patterns, diagrams |
| [data-model.md](docs/data-model.md) | Per-service database schemas and event payloads |
| [api-design.md](docs/api-design.md) | API conventions, endpoint catalog, WebSocket & event contracts |
| [ui-ux.md](docs/ui-ux.md) | Design system — glassmorphic "liquid glass" identity, screens, accessibility (superseded for the mobile apps — see "Mobile apps" below) |
| [security.md](docs/security.md) | AuthN/AuthZ, PII & payment data protection, compliance checklist |
| [devops.md](docs/devops.md) | Environments, CI/CD, deployment, monitoring, backup/DR |
| [testing.md](docs/testing.md) | Test strategy, QA plan, load & field testing |
| [roadmap.md](docs/roadmap.md) | Phased delivery plan (0 → production), team allocation, risks |
| [open-questions.md](docs/open-questions.md) | Pending client inputs that block or shape development |

## Source documents

- `PRD for New Project.pdf` — System Flow & Technical Design (v1.0 draft)
- `Backend MicroServices Architecture New Project.pdf` — SDD-ET-001 Microservices Backend Architecture (v1.0)

The docs in `docs/` supersede both PDFs where they conflict; every deviation is recorded in the relevant doc.

## Repository layout

```
itms/
├── docs/                 # Planning & design docs (source of truth)
├── infra/                # Docker Compose stack (infra + all 12 services + admin panel), DB init
├── libs/
│   ├── common/           # Config, logging, error envelope, health, geo utils, OpenAPI
│   ├── events/           # RabbitMQ event-bus client + outbox pattern
│   ├── auth/              # JWT guard, roles decorator (consumed by all services)
│   └── design-tokens/     # Shared color/glass tokens — ported by hand into each app's
│                          # theme (Tailwind config for admin, Dart constants for Flutter)
├── services/              # The 12 microservices (NestJS) — auth, passenger, driver, dispatch,
│                          # geofence, tracking, ride, fare, payment, document, notification,
│                          # admin-reporting
├── apps/
│   ├── admin/             # Admin Web Panel (Next.js)
│   ├── passenger/         # Passenger App (Flutter — Android/iOS/web)
│   └── driver/            # Driver App (Flutter — Android/iOS/web)
├── scripts/               # Dev scripts: key generation, migrate-all
└── keys/                  # Local JWT keys (git-ignored; see keys/README.md)
```

> **Monorepo tooling:** the backend uses **npm workspaces** with TypeScript project
> references as the base. This is the layout Nx wraps; the Nx task-graph layer noted in
> `docs/techstack.md` can be layered on without moving files. Recorded deviation, not a scope cut.

## Local development (single service, without Docker)

```bash
npm install
cp .env.example .env
npm run keys:gen
npm run infra:up          # infra + services all start via Docker; or run just infra containers
                           # and iterate on one service natively:
npm run -w @itms/auth-service start:dev

# Lint / format / test (fast, no infra needed)
npm run lint
npm test
```

## Mobile apps (Flutter)

Both apps run against the same backend as everything else — no separate mock mode. With
the stack up (`npm run infra:up` + `npm run migrate:all`, or the services running natively):

```bash
cd apps/passenger   # or apps/driver
flutter pub get
flutter run -d chrome   # or an Android device/emulator — flutter run -d <device-id>
```

Default API base URLs point at `localhost` with the same ports `infra/docker-compose.yml`
publishes, so no config is needed for local dev. Override per build with `--dart-define`
(e.g. `flutter build apk --dart-define=AUTH_BASE_URL=https://auth.itms.example`).

**Design system:** both apps' visual language (colors, typography, spacing, radii, shadows,
motion) was restyled from a third-party "drivver" design system (Sora/Plus Jakarta
Sans/JetBrains Mono type trio, sky-cyan brand with ink-navy text on primary buttons, flat
white cards/sheets with soft cool-tinted shadows) — `theme/tokens.dart` and
`theme/app_theme.dart` in each app are the source of truth, ported by hand from that
system's `tokens/*.css`; `widgets/glass_panel.dart` (the shared card/sheet primitive every
screen composes with) was rewritten to match while keeping its name/API stable so no
screen needed touching. This is a visual system only — the product's own flows, copy, and
"drivver" branding were **not** adopted (still the Electric Taxi product name/logic
throughout); the design system's own generic rider-app mockup (upfront ride-tier
pricing, card payment, destination search) was likewise not adopted since it contradicts
real decisions already made here (no upfront fare, one vehicle type, cash/JazzCash-first).
Fonts are bundled as local assets (`assets/fonts/`), not fetched at runtime via
`google_fonts`, for the same reason `maplibre-gl-js` is vendored rather than CDN-loaded.

**Known gaps, documented in code rather than faked:**
- Both apps use real device GPS (`geolocator`) for the passenger's default pickup/map
  center and the driver's start/no-show proximity checks and SOS position, falling back
  to tap-to-set (passenger) or the ride's own pickup point (driver, matching
  `scripts/smoke-test.mjs`'s headless behavior) only if permission is denied or the
  device won't answer. No live driver-position marker is shown to the passenger during
  a trip, though — no backend gateway pushes one (Tracking only derives distance
  post-ride, for Fare).
- Maps are rendered with **MapLibre GL** (`maplibre_gl` package, pinned to `0.22.0` for
  compatibility with Flutter 3.24.5 — newer releases require a Flutter SDK this project
  isn't pinned to yet), wrapping the same keyless OSM raster tiles the apps have always
  used rather than a vector tile provider or API key. `maplibre-gl-js` itself is vendored
  under each app's `web/vendor/` (see the README there) instead of loaded from a CDN, so
  the map doesn't depend on a third party's uptime at runtime.
- The Driver app's Documents and Earnings screens are placeholders: uploading a document
  needs a 3-step signed-URL flow against the Document service that isn't wired up, and
  there's no backend endpoint yet for a driver to see their own ride history or earnings.
- Dispatch's ride offers reach a driver's app via a WebSocket room on `RideGateway`
  (`services/ride/src/rides/ride.gateway.ts`) — this didn't exist until the Driver app needed
  it; Dispatch itself has no client-facing surface, so this is the only delivery path today.

## Verifying it actually works

This isn't just "it builds" — there's a real end-to-end proof:

- **Unit tests** (`npm test`): 101+ tests covering the pure domain logic in every service
  (ride state machine, dispatch matching, geofence hysteresis, fare formula, payment retry
  policy, CQRS projections) — run in seconds, no infra required.
- **`npm run e2e:smoke`** (see `scripts/smoke-test.mjs`): drives the real HTTP APIs across the
  running Docker Compose stack through a full ride lifecycle — onboard a driver & vehicle, pair
  a geofence zone, request a ride as a passenger, accept it via Dispatch's atomic claim, start
  and end the trip, confirm Fare and Payment complete it, and confirm an admin can log in and
  see it in Reports. This is the test that proves the 12 services actually talk to each other
  correctly, not just that each one compiles in isolation.
- **CI** (`.github/workflows/ci.yml`) runs both on every push: unit tests always, and a
  `docker-e2e` job that builds every image, brings up the full stack, and runs the smoke test —
  because this sandbox environment has no Docker daemon, **CI is the environment that actually
  proves the system works end-to-end**, continuously.
- **Mobile apps**: both were driven end-to-end (login → book/accept a real ride → pay → rate)
  as their `flutter build web` output, browser-automated against the live backend — not just
  `flutter analyze`/`flutter test`. That process is what caught real bugs unit tests couldn't:
  missing CORS on every service, an ID-space mismatch in a new endpoint, a stuck-forever UI
  from a Postgres `bigint` field serializing as a JSON string, the fact that dispatch ride
  offers had no delivery path to a driver's device at all until this work added one, and a
  Flutter web build that silently dropped the `geolocator`/`maplibre_gl` web plugins'
  registration after a dependency change (fixed by `flutter clean` before rebuilding),
  and a `maplibre_gl` web bug where a raw JSON style string is handed straight to
  `maplibre-gl-js`'s `setStyle()`, which always treats a plain string as a URL to fetch
  rather than inline style JSON — worked around by encoding the style as a `data:` URL
  instead. Geolocation was verified with real Chromium CDP permission grants and injected
  coordinates, including a permission-denied case, not just code review. The MapLibre
  swap was verified structurally the same way (style parses and applies, camera moves,
  tap-to-set-pickup still works, markers add/remove, no uncaught errors) — actual OSM
  tile *pixels* couldn't be visually confirmed in this sandbox, because the browser's
  network path can't reach external hosts at all here (confirmed independent of
  MapLibre: a plain `fetch()` to any external host from inside the sandboxed Chromium
  gets `ERR_CONNECTION_RESET`, while the same request from `curl` succeeds) — a sandbox
  networking limitation, not a code defect; tile loading needs confirming on a real
  device/browser outside this sandbox.

Service ports and credentials are documented in `.env.example` and `infra/docker-compose.yml`.
