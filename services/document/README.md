# Document/Media Service

Signed-URL upload handshake and metadata for driver documents and receipts
(docs/api-design.md §Documents; data-model.md · 12 document/media).

## Flow
1. `POST /upload-url {owner_type, owner_id, kind, mime}` → validates the MIME
   type is allowed for that document kind (pure, unit-tested —
   `domain/bucket-key.ts`), creates a `media` row, returns a signed PUT URL.
2. Client uploads bytes **directly to object storage** (never through this
   service's own request body).
3. `POST /:mediaId/finalize {sha256, size_bytes}` → records the checksum,
   marks scanned, publishes `document.uploaded`.
4. `GET /:mediaId` → a signed, time-limited (default 5 min) GET URL, refused if
   the scan flagged the file `infected`.

## Storage adapter — stubbed pending infra wiring
`MediaStorage` is a two-method interface (`presignPutUrl`, `presignGetUrl`).
The stub adapter generates well-formed URLs against the configured
`S3_ENDPOINT`/`S3_BUCKET` so the full upload/finalize/download handshake, DB
records, and events work end-to-end today. A real adapter (MinIO SDK, or
`@aws-sdk/client-s3` + `s3-request-presigner` against the same endpoint from
docs/techstack.md §5) plugs in behind this interface — no other code changes.
Antivirus scanning is likewise a documented stub: `finalize` marks `clean`
immediately rather than queuing a real scan job.

## Bucket layout (pure, unit-tested)
`itms-{env}/{kind}/{owner_id}/{media_id}` — see `domain/bucket-key.ts`.

## Endpoints
| Method | Path |
|---|---|
| POST | `/v1/documents/upload-url` |
| POST | `/v1/documents/:mediaId/finalize` |
| GET | `/v1/documents/:mediaId` |

## Events
- **Publishes:** `document.uploaded` (verification/`document.verified` is a
  follow-up once a real review workflow is wired to Driver's document review)
