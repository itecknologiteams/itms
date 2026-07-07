/**
 * Bucket layout (docs/data-model.md · 12 document/media): pure and unit-tested
 * so the key scheme is documented and verified independent of any storage SDK.
 *   itms-{env}/{kind}/{owner_id}/{media_id}
 */
export function bucketKey(env: string, kind: string, ownerId: string, mediaId: string): string {
  return `itms-${env}/${kind}/${ownerId}/${mediaId}`;
}

/** Allowed MIME types per document kind (docs/specs.md A-04, driver documents). */
const ALLOWED_MIME: Record<string, string[]> = {
  license: ['image/jpeg', 'image/png', 'application/pdf'],
  cnic: ['image/jpeg', 'image/png'],
  photo: ['image/jpeg', 'image/png'],
  registration: ['image/jpeg', 'image/png', 'application/pdf'],
  receipt_pdf: ['application/pdf'],
};

export function isAllowedMime(kind: string, mime: string): boolean {
  const allowed = ALLOWED_MIME[kind];
  return allowed ? allowed.includes(mime) : false;
}
