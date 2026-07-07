/**
 * Idempotency key format for payment attempts (docs/specs.md §8.2):
 * `pay:{ride_id}:{attempt_n}`. Guarantees a ride can never accumulate two
 * successful payments from the same attempt being retried at the HTTP layer.
 */
export function idempotencyKey(rideId: string, attemptN: number): string {
  return `pay:${rideId}:${attemptN}`;
}

export function parseIdempotencyKey(key: string): { rideId: string; attemptN: number } | null {
  const m = /^pay:(.+):(\d+)$/.exec(key);
  if (!m) return null;
  return { rideId: m[1], attemptN: Number(m[2]) };
}
