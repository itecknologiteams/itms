# Electric Taxi Management System (ITMS)

Ride-hailing platform for the **Sindh Government Electric Taxi Initiative**, built by iTecknologi Group.
Electric taxis operate inside admin-defined geo-fenced zones; passengers book rides with no upfront fare,
fare is computed post-ride from GPS-measured time and distance, and every vehicle is continuously
tracked and validated against its paired geofence.

## Platform components

| Component | Technology | Repo path (planned) |
|---|---|---|
| Passenger App (Android + iOS) | Flutter | `apps/passenger` |
| Driver App (Android) | Flutter | `apps/driver` |
| Admin Web Panel | Next.js (React) | `apps/admin` |
| Backend (12 microservices) | NestJS monorepo | `services/*` |
| Infrastructure | Docker / Kubernetes / Terraform | `infra/` |

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
