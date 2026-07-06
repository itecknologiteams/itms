# Technology Stack — Committed Choices

**Doc:** `techstack.md` · **Version:** 1.0 · **Status:** Baseline for build

The PDFs left several "A / B" choices open. This document **commits** each choice with rationale,
sized for the agreed constraints: **full 12-microservice architecture**, **3–5 developers**, **4–6 month v1**.
Where a choice deliberately deviates from or narrows the SDD, it is marked **(decision)**.

---

## 1. Summary Table

| Layer | Choice | Alternatives rejected |
|---|---|---|
| Passenger app | **Flutter** (Android + iOS) | React Native, native ×2 |
| Driver app | **Flutter** (Android; iOS-capable) | Native Android |
| Admin panel | **Next.js 14+ (React, TypeScript)** | Vue/Nuxt, plain SPA |
| Backend services | **NestJS (Node 20, TypeScript) — one monorepo, 12 deployables** | Spring Boot, Go per-service |
| API gateway | **Kong Gateway (OSS)** (decision) | NGINX (too manual), KrakenD (smaller ecosystem) |
| Sync inter-service | **REST (internal) + gRPC only where hot** (decision: REST-first) | gRPC everywhere |
| Event bus | **RabbitMQ** (decision) | Kafka (deferred, see §4) |
| GPS ingestion broker | **EMQX (MQTT)** | Mosquitto (no clustering/dashboard) |
| Relational DB | **PostgreSQL 16** — one logical DB per service | MySQL |
| Geo queries | **PostGIS** (geofence_db) | — |
| GPS time-series | **TimescaleDB** (extension on tracking DB) | InfluxDB, ClickHouse |
| Cache / live geo / dispatch state | **Redis 7** (GEO, streams, locks) | — |
| Object storage | **S3-compatible: MinIO** (self-host) / AWS S3 (cloud) | — |
| Push | **Firebase Cloud Messaging** | — |
| SMS | Local gateway aggregator (Telenor/Jazz enterprise SMS) **[OPEN-3]** | — |
| Maps & routing | **Google Maps Platform** (SDKs, Directions, Distance) (decision) | OSM/self-hosted OSRM (fallback if cost blocks) |
| Payments | **JazzCash REST API** + **1LINK-compliant card gateway [OPEN-3]** | — |
| Container platform | **Kubernetes (k3s on VMs / managed EKS-GKE)** — cloud-agnostic | Docker Compose (dev only), PM2 (rejected for prod) |
| IaC | **Terraform + Helm** | — |
| CI/CD | **GitHub Actions** (monorepo, path-filtered per service) | Jenkins, GitLab CI |
| Observability | **Prometheus + Grafana + Loki + Tempo (OTel)** | ELK (heavier to run) |
| Error tracking | **Sentry** (self-host or SaaS) | — |

---

## 2. Backend: NestJS monorepo, 12 deployables

**The critical reconciliation:** the client requires 12 microservices; the team is 3–5 devs.
We keep **one repository, one framework, one toolchain** and produce **12 independently
deployable services** from it.

- **Monorepo:** Nx workspace. `services/auth`, `services/passenger`, … `services/document` — each a NestJS app with its own Dockerfile, Helm chart, and pipeline (path-filtered).
- **Shared libraries** (`libs/`): auth guards & JWT validation, event-bus client (publish/subscribe + outbox), DTO contracts, logging/tracing setup, error envelope, config loader, health checks. One fix propagates everywhere; services stay thin.
- **Uniform service template:** every service exposes `/health`, `/ready`, `/metrics`, OpenAPI at `/docs`, and follows identical layering (controller → service → repository).
- **Deviation note vs SDD:** SDD allows gRPC broadly. We commit to **REST for internal sync calls in v1** (same team owns all services; REST keeps debugging simple), with gRPC reserved for the two hot internal paths if profiling demands it (dispatch→tracking proximity reads, ride→fare compute).

**Node/NestJS rationale:** matches PRD suggestion, TypeScript across backend+admin+shared DTOs, first-class WebSocket support, largest hiring pool locally.

## 3. Mobile: Flutter for both apps

- Single language/team for passenger + driver; consistent design system (see ui-ux.md).
- Driver-app background GPS on Android via `flutter_background_service` + foreground service notification (required by Android 14+), FCM high-priority for ride offers with full-screen intent.
- iOS build of the driver app is kept compiling (CI) but not shipped in v1.
- State management: **Riverpod**; navigation: **go_router**; maps: `google_maps_flutter`; local queue for offline driver actions: **drift** (SQLite).

## 4. Event bus: RabbitMQ (decision, with migration trigger)

- Volumes: domain events ≪ 1k msg/s at pilot scale; GPS firehose stays on MQTT→Tracking and does **not** transit the bus (only sampled `vehicle.location.updated` at 30 s cadence for consumers that need it).
- RabbitMQ gives routing (topic exchanges), per-service queues, DLQs, and a small ops footprint — right-sized for a 3–5 dev team.
- **Migration trigger to Kafka:** if event volume > 5k msg/s sustained, or replay/event-sourcing becomes a product need (Admin/Reporting CQRS beyond daily rebuilds). The shared event-bus lib isolates broker choice behind one interface.

## 5. Datastores per service (SDD-conformant)

| Service | Store |
|---|---|
| Auth | `auth_db` (PostgreSQL) |
| Passenger | `passenger_db` (PostgreSQL) |
| Driver | `driver_db` (PostgreSQL) |
| Dispatch | Redis (live state) + journal via Ride outbox |
| Geofence | `geofence_db` (PostgreSQL + PostGIS) |
| Tracking | Redis GEO (live) + `tracking_db` (PostgreSQL + TimescaleDB) |
| Ride | `ride_db` (PostgreSQL) |
| Fare | `fare_db` (PostgreSQL) |
| Payment | `payment_db` (PostgreSQL) |
| Notification | `notif_db` (PostgreSQL) |
| Admin/Reporting | `reporting_db` (PostgreSQL, materialized read models — **decision:** CQRS needs a concrete read store; "event-stream reads" alone is not one) |
| Document/Media | MinIO/S3 bucket (+ metadata in `document_db` PostgreSQL) |

Deployment note: one physical Postgres cluster (HA pair) hosting isolated logical databases with per-service credentials in v1; per-service physical clusters only when scale demands. Ownership boundaries (no cross-DB access) are enforced by credentials, not hardware.

## 6. Hosting: cloud-agnostic (decision pending [OPEN-2])

Everything ships as containers on Kubernetes; nothing binds to a specific cloud:

| Concern | In-country VMs (data residency) | International cloud |
|---|---|---|
| K8s | k3s (3 masters + workers) | EKS / GKE |
| Postgres | Self-managed HA (Patroni) + WAL-G to MinIO | RDS / CloudSQL |
| Redis / RabbitMQ / EMQX | Helm charts, HA mode | ElastiCache / AmazonMQ optional |
| Object storage | MinIO | S3 |
| Decision checklist | Sindh Govt data-residency ruling, DC uptime SLA, bandwidth to Karachi users | Legal sign-off for PII offshore |

## 6a. Implementation decisions (recorded during Phase 0 build)

These were unspecified in the PDFs and are fixed here as the build begins:

| Decision | Choice | Rationale |
|---|---|---|
| Monorepo base | **npm workspaces + TypeScript project references** | Zero-config, reliable; this is the layout Nx wraps. Nx's affected-graph/caching can be layered on later without moving files. |
| ORM / migrations | **TypeORM 0.3** | First-class NestJS integration, explicit migrations (no auto-sync), raw SQL escape hatch for PostGIS. |
| Password hashing | **argon2id** | Matches security.md §1. |
| JWT signing | **jsonwebtoken** (RS256) | Direct control over sign/verify; keys from file (dev) or secret manager (prod). |
| TOTP (admin 2FA) | **otplib** | Standard RFC 6238. |
| IDs | **UUID v7** (`uuid`) | Time-ordered, index-friendly (matches data-model.md). |

## 7. Versions & standards

- Node 20 LTS · TypeScript 5.x · NestJS 10 · Flutter 3.2x (stable) · PostgreSQL 16 · Redis 7 · RabbitMQ 3.13 · Kong 3.x · Kubernetes 1.29+
- Code style: ESLint + Prettier (TS), `dart format` + `flutter_lints`; conventional commits; OpenAPI 3.1 for every service.
