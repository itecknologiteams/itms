# Electric Taxi Management System (ITMS)

Ride-hailing platform for the **Sindh Government Electric Taxi Initiative**, built by iTecknologi Group.
Electric taxis operate inside admin-defined geo-fenced zones; passengers book rides with no upfront fare,
fare is computed post-ride from GPS-measured time and distance, and every vehicle is continuously
tracked and validated against its paired geofence.

## Status

| Component | Status |
|---|---|
| Backend — 12 microservices | ✅ Built, unit-tested, dockerized |
| Admin Web Panel (Next.js) | ✅ Built, verified against mock data; wired for the real backend |
| Passenger / Driver apps (Flutter) | ⏳ Not started — needs a Flutter toolchain |
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
| Passenger App (Android + iOS) | Flutter | `apps/passenger` (not started) |
| Driver App (Android) | Flutter | `apps/driver` (not started) |
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
| [ui-ux.md](docs/ui-ux.md) | Design system — glassmorphic "liquid glass" identity, screens, accessibility |
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
│   └── design-tokens/     # Shared color/glass tokens — consumed by the admin panel today,
│                          # and by the Flutter apps once mobile work starts
├── services/              # The 12 microservices (NestJS) — auth, passenger, driver, dispatch,
│                          # geofence, tracking, ride, fare, payment, document, notification,
│                          # admin-reporting
├── apps/
│   └── admin/             # Admin Web Panel (Next.js)
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

Service ports and credentials are documented in `.env.example` and `infra/docker-compose.yml`.
