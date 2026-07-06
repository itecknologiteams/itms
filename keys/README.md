# JWT signing keys

This directory holds the **RS256 keypair** used by the Auth service to sign JWTs and by all
other services to verify them.

**Real keys are never committed** (see `.gitignore`). Each environment provisions its own pair
via the secret manager (see `docs/security.md §1`).

## Generate a local dev keypair

```bash
npm run keys:gen
```

This writes `jwt_private.pem` and `jwt_public.pem` here. They are git-ignored.
In production, keys are mounted from the secret manager and rotated by `kid` quarterly.
