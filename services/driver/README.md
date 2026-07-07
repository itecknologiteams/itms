# Driver Service

Driver and vehicle onboarding, documents, online/offline status
(docs/specs.md D-01…D-15, A-04; data-model.md · 03 driver_db).

## Responsibilities
- **Onboarding:** provisions the driver's login identity via Auth's internal
  API, then owns the profile (license, CNIC, documents) locally.
- **Vehicle registry:** plate, tracker device id, status; assigning a vehicle to
  a driver closes any prior open assignment on either side.
- **Online eligibility (pure, unit-tested — `domain/eligibility.ts`):** a driver
  may go online only if approved, has a vehicle, is not suspended, and their
  license hasn't expired. Precedence is deterministic and tested.
- **Suspensions:** admin-initiated or policy-driven (a `geofence.violation.escalated`
  event forcibly suspends the driver bound to the offending vehicle —
  docs/specs.md §6.5 escalation).
- **Documents:** review workflow (pending → approved/rejected); the media bytes
  themselves live in the Document/Media service.

## Endpoints (v1)
| Method | Path | Role |
|---|---|---|
| POST | `/v1/drivers` | admin — onboard |
| GET | `/v1/drivers` `/v1/drivers/:id` | admin |
| GET | `/v1/drivers/me` | driver — own profile |
| PATCH | `/v1/drivers/me/status` | driver — online/offline (eligibility-gated) |
| POST | `/v1/drivers/:id/approve` `/reject` | supervisor+ |
| POST | `/v1/drivers/:id/vehicle` | admin — assign vehicle |
| POST | `/v1/drivers/:id/suspend` `/lift-suspension` | supervisor+ |
| POST | `/v1/drivers/:id/documents` + `/review` | driver upload, admin review |
| POST/GET/PATCH | `/v1/vehicles*` | admin — onboarding, status |

## Events
- **Publishes:** `driver.status.changed`, `driver.suspended`, `vehicle.updated`
- **Subscribes:** `dispatch.assigned` (→ on-trip), `ride.completed/cancelled`
  (→ back online), `geofence.violation.escalated` (→ forced suspension)

## Note
Vehicle-to-**zone** pairing is owned by the Geofence service (it draws and
manages zones); this service owns the vehicle record itself and its
tracker-device mapping, publishing `vehicle.updated` on onboarding/status change.
