# Notification Service

Push (FCM) and SMS dispatch, bilingual admin-editable templates
(docs/specs.md §10; data-model.md · 10 notif_db).

## Flow
`POST /internal/notify {auth_user_id, template_key, channel, lang, variables, destination}`
→ resolves the template (falls back to English if the requested language isn't
authored) → renders `{{variables}}` (pure, unit-tested — `domain/template-renderer.ts`)
→ dispatches via the Push or SMS provider → logs to `notifications` → publishes
`notification.sent`/`.failed`.

Seed templates cover the core events in the notification matrix (docs/specs.md
§10): driver assigned/arrived, fare ready, payment success/failed, ride
cancelled, no driver found, document expiring — bilingual EN/UR, editable via
the templates table without a deploy.

## Recipient resolution — an intentional design decision
This service takes `auth_user_id` + `destination` (device token or phone)
**as input**; it does not derive them itself. Reasoning:
- Push tokens live in Auth's `devices` table; passenger/driver **domain** ids
  (`ride.passenger_id`, `ride.driver_id`, etc.) are not auth user ids.
- **Database-per-service** means Notification cannot read Auth's or
  Passenger/Driver's tables directly to bridge that gap.
- The service that already owns the identity mapping (Driver and Passenger
  both store `auth_user_id` on their own record — see their `AuthClient`
  patterns) is the correct place to resolve a recipient before calling this API.

**Follow-up (tracked, not silently skipped):** wiring the 8 previously-built
services' event consumers to resolve recipients and call
`POST /internal/notify` for every matrix row is the next integration pass. This
service's own pipeline (templates, rendering, provider dispatch, delivery log)
is complete and correct today; only the "who do I notify" plumbing from other
services remains.

## Provider adapters — stubbed pending FCM/SMS credentials
`PushProvider`/`SmsProvider` are 1-method interfaces; stub implementations
always succeed so the rendering → dispatch → logging pipeline is fully
exercised now. Real `firebase-admin` (FCM) and an SMS aggregator client
(OPEN-3) plug in behind the same interfaces.

## Endpoints
| Method | Path | Role |
|---|---|---|
| POST | `/v1/notifications/internal/notify` | internal (network-locked) |
| POST | `/v1/notifications/broadcasts` | super admin |
| GET | `/v1/notifications/broadcasts` | admin |

## Events
- **Publishes:** `notification.sent`, `notification.failed`
