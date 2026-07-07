export interface MediaStorage {
  /** A time-limited URL the client PUTs the file bytes to directly. */
  presignPutUrl(bucketKey: string, mime: string, ttlSeconds: number): Promise<string>;
  /** A time-limited URL to GET the file (docs/security.md §3: ≤5 min for CNIC/license). */
  presignGetUrl(bucketKey: string, ttlSeconds: number): Promise<string>;
}

export const MEDIA_STORAGE = Symbol('MEDIA_STORAGE');
