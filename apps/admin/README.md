# Admin Panel

Next.js 14 (App Router) web dashboard for zone management, driver/vehicle
onboarding, violation handling, fare configuration, reporting, and broadcasts
(docs/specs.md §2.3 A-01…A-13; docs/ui-ux.md §5 "glass-accented dashboard").

## Design system
The app shell and KPI cards use the three-tier glass recipe from
`docs/ui-ux.md` (`glass-raised` / `glass-overlay` / `glass-modal` in
`globals.css`, composed via `<GlassPanel tier=…>`); data tables, forms, and
charts sit on solid surfaces for density and legibility, per the documented
"glass is the signature, not the wallpaper" rule. Color tokens are read from
`libs/design-tokens/tokens.json`, the same file the Flutter apps will consume
in Phase 1 mobile work — Tailwind is not the source of truth, that JSON file is.

## Running it

```bash
# from repo root
npm install
cp apps/admin/.env.example apps/admin/.env.local
npm run -w @itms/admin dev   # http://localhost:3100
```

### Demo / mock mode
This sandbox has no Docker daemon, so the 12 backend services can't run live
here. With `NEXT_PUBLIC_MOCK_MODE=true` (the `.env.example` default), every
`src/features/*/api.ts` module serves seeded, mutable in-memory data instead
of calling the backend — every page, form, and mutation is fully clickable
and demonstrates real interaction (creating a zone, suspending a driver,
resolving a violation) without any live infrastructure.

### Real backend mode
Set `NEXT_PUBLIC_MOCK_MODE=false` and either:
- run the 12 services locally (see the root README) — `next.config.js`
  rewrites `/api/v1/<prefix>/*` to each service's own port, emulating Kong's
  routing table for local dev, or
- set `API_GATEWAY_URL` to a real Kong instance in staging/production, and
  every `/api/v1/*` call forwards there as a single origin.

## Auth
Two-step admin login (email+password → TOTP), matching the Auth service's
`/v1/auth/admin/login` + `/v1/auth/admin/totp` (docs/security.md §1). Tokens
are stored in `localStorage` and attached as `Authorization: Bearer` by the
API client — see `src/lib/tokens.ts` for the documented tradeoff versus an
httpOnly-cookie + BFF design, which is the recommended hardening for
production/public exposure.

## Pages
Overview, Zones (click-to-draw polygon editor on an OpenStreetMap/Leaflet
map — no API key needed), Vehicles, Drivers, Violations, Fare Config,
Reports (charts + CSV export), Broadcasts, Audit Log.

## Not yet built
Live fleet map (real-time vehicle positions via the Tracking service's
WebSocket), ride monitor with trail replay, and the command palette mentioned
in docs/ui-ux.md §5 — tracked as follow-ups, not silently skipped.
