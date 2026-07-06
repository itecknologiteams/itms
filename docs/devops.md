# DevOps — Environments, CI/CD, Operations

**Doc:** `devops.md` · **Version:** 1.0 · **Status:** Baseline for build
**Constraint honored:** cloud-agnostic (hosting decision **[OPEN-2]**) — everything runs on Kubernetes from containers; only the provisioning layer differs between in-country VMs and managed cloud.

---

## 1. Environments

| Env | Purpose | Shape |
|---|---|---|
| **local** | Dev laptops | Docker Compose: Postgres+PostGIS+Timescale, Redis, RabbitMQ, EMQX, MinIO, Kong, all services via Nx `serve`; seed script (zones, vehicles, drivers, fare config); **GPS simulator** container replaying NMEA/CSV routes through MQTT — no hardware needed for dev. |
| **dev** | Integration, auto-deployed from `main` | Small k3s/K8s namespace, sandbox gateways |
| **staging** | Release candidates, UAT, load & pen tests | Production-shaped (HA pairs), anonymized-ish seed data, JazzCash/card sandbox, 2–3 real tracker devices |
| **production** | Live | Full HA (below) |

## 2. Repository & CI/CD (GitHub Actions, Nx monorepo)

- **Branching:** trunk-based. Short-lived feature branches → PR → `main`. Release = tag `vX.Y.Z` per service group; hotfix branches from tag.
- **PR pipeline:** lint + typecheck → unit tests → build affected (Nx affected-graph) → integration tests (testcontainers) → SAST/secret/dep scans (security.md §7). Merge blocked on red.
- **Deploy pipeline per service (path-filtered):** build Docker image (SBOM + Trivy scan) → push registry → Helm upgrade to **dev** (auto) → **staging** (auto on release tag) → **production** (manual approval).
- **DB migrations:** per-service migration folders; run as Helm pre-upgrade Job; **expand→migrate→contract** discipline (never breaking column drops in the same release); rollback = previous image + down-migration only if contract phase not yet run.
- **Mobile CI (Codemagic or GH Actions + fastlane):** PR → analyze/test/build; `main` → internal track (Firebase App Distribution); release tag → Play internal→closed→production staged rollout, App Store via TestFlight. Signing keys in CI secret store.
- **Admin panel:** Next.js container behind Kong, same pipeline as services.

## 3. Kubernetes layout

```
namespaces: itms-gateway | itms-core (12 services) | itms-data (operators) | itms-observability
per service: Deployment (≥2 replicas prod) · HPA (CPU+RPS) · PDB · liveness/readiness ·
             resource requests/limits · NetworkPolicy · ServiceMonitor
stateful:   Postgres (CloudNativePG/Patroni, sync replica) · Redis (replica+Sentinel) ·
            RabbitMQ (3-node quorum queues) · EMQX (2 nodes) · MinIO (4-node erasure, self-host path)
ingress:    Kong (2+ replicas) behind LB; cert-manager (Let's Encrypt or govt CA)
```
Production sizing (pilot, 200–500 vehicles): 6–8 worker nodes (8 vCPU/32 GB), headroom ≥ 40%.
IaC: Terraform (infra) + Helm charts per service + one umbrella chart per env; all env config in git (ArgoCD optional adoption in Phase 3).

## 4. Observability & Alerting

- **Metrics:** Prometheus; RED per service + business KPIs (rides/min, match rate, offer-acceptance rate, GPS ingest lag, DLQ depth, payment success rate).
- **Logs:** Loki, structured JSON, `trace_id`/`ride_id` correlation. **Traces:** Tempo via OTel (100% on payment/ride paths, 10% elsewhere). **Errors:** Sentry (backend + Flutter + Next.js).
- **Dashboards:** per-service golden signals; Ops board (fleet online, live rides, violations); Finance board (revenue, reconciliation status).
- **Alert policy (PagerDuty/Opsgenie or on-call rota):**

| Alert | Threshold | Sev |
|---|---|---|
| Ride-critical path down (gateway/ride/dispatch/tracking) | availability probe fail 2 min | SEV-1 |
| Payment success rate | < 90% over 15 min | SEV-1 |
| GPS ingest lag | p95 > 30 s for 5 min | SEV-2 |
| Match rate (offers→assigned) | < 60% over 30 min | SEV-2 |
| DLQ depth | > 100 msgs | SEV-2 |
| Tracker stale fleet-wide | > 20% vehicles | SEV-2 |
| Disk/DB replication/backup failure | any | SEV-2 |

## 5. Backup & DR (meets N-08: RPO ≤ 5 min)

- Postgres: WAL streaming to object storage (WAL-G) → **PITR, RPO ≤ 5 min**; nightly full base backup; retention 30 d + monthly 12 m. **Quarterly restore drill is mandatory** (calendar item, runbook).
- MinIO/S3: versioned bucket + replication to second location. Redis: AOF everysec (cache-class; system of record is Postgres). RabbitMQ: quorum queues; outbox tables make lost messages recoverable.
- `reporting_db`: rebuildable from events — documented rebuild runbook (projection replay CLI).
- DR: single-region v1 with off-site backups; **RTO 4 h** via IaC re-provision + PITR restore. Multi-region deferred (recorded risk).

## 6. Release & rollback

- Staged: deploy → smoke suite (synthetic ride E2E against staging/prod-canary) → shift traffic. Kong canary (5% → 100%) for gateway-routed services.
- Rollback: `helm rollback` to previous revision (< 5 min); DB contract-phase discipline keeps N-1 compatibility.
- Feature flags (Unleash self-host): dispatch tuning, payment-method toggles, kill-switches (disable ride creation / digital payments independently — security.md §6).
- Mobile: staged rollout (5/20/50/100%), forced-update mechanism (min-version check at API gateway → apps show update screen).

## 7. Runbooks (authored during Phase 3, listed now)

RabbitMQ DLQ drain/replay · Redis failover · Postgres PITR restore · projection rebuild ·
EMQX device-auth issues · payment gateway outage (auto cash-fallback verification) ·
tracker fleet outage · zone-edit gone wrong (version revert) · SEV-1 incident process + postmortem template.

## 8. On-call & incident management

- Business-hours on-call during pilot (team of 3–5), escalating to 24/7 for full launch **[staffing OPEN-10]**.
- SEV-1: page immediately, status update to stakeholders ≤ 30 min, postmortem ≤ 72 h (blameless, action items tracked).
