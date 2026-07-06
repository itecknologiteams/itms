# Auth Service

Reference implementation for the ITMS microservices. Owns identities, OTP login,
JWT issuance, refresh-token rotation, device binding, and admin 2FA
(docs/data-model.md · 01 auth_db; docs/security.md §1).

Every other service is expected to follow this layout: `config/`, `entities/`,
`migrations/`, feature folders, uniform `/health` `/ready` `/docs`, the shared
error envelope, structured logging, and the outbox for events.

## Endpoints (v1)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/v1/auth/otp/request` | public | Send OTP `{phone, purpose}` |
| POST | `/v1/auth/otp/verify` | public | Verify → `{access, refresh, is_new_user}` |
| POST | `/v1/auth/token/refresh` | public | Rotate refresh token (reuse detection) |
| POST | `/v1/auth/logout` | public | Revoke a refresh token |
| POST | `/v1/auth/admin/login` | public | Admin step 1 → TOTP challenge |
| POST | `/v1/auth/admin/totp` | public | Admin step 2 → tokens |
| POST | `/v1/internal/users` | internal | Provision driver/admin accounts (network-locked) |
| GET | `/health` `/ready` | public | Liveness / readiness |
| GET | `/docs` | internal | OpenAPI UI |

## Local run

```bash
# from repo root
npm install
cp .env.example .env
npm run keys:gen
npm run infra:up
npm run -w @itms/auth-service migration:run
npm run -w @itms/auth-service start:dev
```

## Events published
- `user.registered` — on first-time passenger self-registration (via outbox).

## Notes
- Passengers self-register on first OTP verify (`purpose=register`).
- Driver/admin accounts are pre-provisioned via `/internal/users` during onboarding.
- SMS delivery is the Notification Service's job (OPEN-3); in dev, `OTP_DEV_ECHO=true` logs the code.
