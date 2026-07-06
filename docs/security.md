# Security & Compliance

**Doc:** `security.md` · **Version:** 1.0 · **Status:** Baseline for build
**Benchmark:** OWASP ASVS L1 mandatory for v1 release; L2 targeted for payment & auth flows.

---

## 1. Authentication & Session

| Concern | Control |
|---|---|
| Passenger/Driver login | Phone + OTP (SMS). OTP: 6 digits, 3 min expiry, hash-stored, 5 attempts/30 min/phone, resend cooldown 60 s, generic errors (no enumeration). |
| Admin login | Email + password (argon2id) + **mandatory TOTP 2FA**. Admin sessions 8 h max, IP + device logged. |
| Tokens | JWT RS256. Access 15 min; refresh 30 days **rotating** with reuse detection (reuse → revoke family, force re-login). Keys in secret manager, kid-based rotation quarterly. |
| Device binding | One active device per driver; new device login revokes old and notifies. |
| WebSocket | JWT at handshake; connection dropped on token expiry (client silently re-auths). |
| Tracker (MQTT) | Per-device credentials + ACL to own topic only (api-design §4); credentials rotated on vehicle re-provisioning; TLS on MQTT (8883). |

## 2. Authorization

- Role claims in JWT (`passenger/driver/admin_operator/admin_supervisor/admin_super`); Kong verifies token, **services enforce role + ownership** (passenger sees only own rides; driver only assigned rides).
- Admin RBAC matrix: Operator = read + acknowledge; Supervisor = + violation resolution, driver suspension; Super = + fare config, zone edit, broadcasts, user admin, audit access.
- Internal `/internal/*` APIs: unauthenticated app-layer but locked by Kubernetes NetworkPolicy (only named services can reach) + mTLS via mesh if/when adopted; never routed by Kong.

## 3. Data Protection

| Data class | At rest | In transit | Notes |
|---|---|---|---|
| PII (name, phone, CNIC, license) | Postgres disk encryption + column-level pgcrypto for CNIC/license | TLS 1.2+ everywhere | CNIC images in private bucket, signed URLs ≤ 5 min |
| Location trails | TimescaleDB, encrypted volumes | TLS/MQTTS | Access restricted to admin roles; passenger sees only own ride trails |
| Payment | **No PAN ever stored or transited through our services** — hosted checkout / gateway tokenization only → SAQ-A-level PCI DSS scope | TLS 1.2+ | Callback signatures verified; secrets in secret manager |
| Credentials/secrets | Sealed Secrets / cloud secret manager; no secrets in repo, images, or logs | — | CI secret scanning (gitleaks) blocks merge |
| Logs | PII minimized: phone/CNIC masked (`+92***1234`), no tokens, no coordinates at INFO level | — | Loki retention 90 d |

Retention & privacy: ride + payment records 7 years (fiscal); GPS raw 18 months hot then archive **[OPEN-8]**; passenger delete request → PII anonymization (rides retained, identity detached) — consent & policy text needs Sindh Govt legal review **[OPEN-9]**. Data residency decision **[OPEN-2]** gates hosting.

## 4. Platform & Network

- Single public entrypoint (Kong, TLS terminated, HSTS). Services in private namespaces; NetworkPolicies default-deny between namespaces except declared edges.
- Kong: rate limits (api-design §1), bot/abuse rules on OTP + ride-create, request size caps, IP allowlist option for `/v1/admin/*`.
- Containers: non-root, read-only FS, distroless base images; image scan (Trivy) in CI — critical CVE blocks deploy.
- Dependency hygiene: Renovate weekly; `npm audit`/`osv-scanner` gate in CI.
- DB: per-service credentials, least privilege (no cross-DB grants), TLS to DB, PITR backups (devops.md).

## 5. Application Controls

- Input validation via shared DTO layer (class-validator) on every endpoint; output encoding on admin panel (React default + CSP).
- Admin panel: CSP (no unsafe-inline), SameSite=Lax cookies for session bootstrap, CSRF token on state-changing form posts, clickjacking headers.
- Idempotency keys on money/ride-affecting POSTs (api-design §1) — replay-safe.
- Payment callbacks: signature verification + gateway IP allowlist + amount/ride cross-check before state change.
- SOS and violation flows are tamper-evident: append-only records with actor attribution.
- Mobile: certificate pinning (both apps), no sensitive data in device logs, secure storage (Keystore/Keychain) for tokens, root/jailbreak detection = warn + analytics (not block, v1).
- Anti-fraud (v1 minimal): GPS trail sanity checks (speed outliers filtered in fare), duplicate-device detection for drivers, admin alert on fare adjustments > threshold.

## 6. Audit & Monitoring

- `admin_audit_log` for every admin mutation (who/what/before/after/IP) — Super Admin readable, immutable.
- `ride_transitions` gives complete actor-attributed ride history; payments carry full gateway response trail.
- Security telemetry: auth failure spikes, OTP abuse, token-reuse events, callback signature failures, DLQ growth → Grafana alerts to on-call.
- Incident response runbook (devops.md §8): sev classification, gateway kill-switches (disable ride creation / payments independently), postmortem template.

## 7. SDLC gates

| Gate | When |
|---|---|
| Threat model review (STRIDE-lite per service) | Design phase, updated on major change |
| SAST (eslint-security, semgrep) + secret scan + dep scan + image scan | Every CI run |
| DAST (OWASP ZAP baseline) vs staging | Weekly + pre-release |
| External penetration test | Before pilot launch (blocker: high+ findings closed) — budget owner **[OPEN-10]** |
| ASVS L1 checklist sign-off | Release gate per specs §12 |
