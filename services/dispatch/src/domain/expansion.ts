/**
 * Zone-expansion policy for matching rounds (docs/specs.md §5.3). Round 1 uses the
 * initial N nearest zones; each subsequent round adds one more zone. Matching
 * stops when a driver accepts, all zones are exhausted, or the total wait cap is hit.
 */
export interface ExpansionParams {
  initialZones: number;
  maxZones: number;
  offerMs: number;
  maxTotalWaitMs: number;
  availableZoneCount: number;
}

export interface RoundDecision {
  /** Number of zones to broadcast to this round. */
  zoneCount: number;
  /** Whether another round is permitted after this one. */
  canExpand: boolean;
}

/** Zones included at a given 1-based round. */
export function zoneCountForRound(round: number, p: ExpansionParams): number {
  return Math.min(p.initialZones + (round - 1), p.maxZones, p.availableZoneCount);
}

/**
 * Decide whether to continue after `round` completes with no acceptance.
 * Stops when the elapsed time reaches the cap, or the zone set can no longer grow.
 */
export function shouldContinue(round: number, elapsedMs: number, p: ExpansionParams): boolean {
  if (elapsedMs + p.offerMs > p.maxTotalWaitMs) return false;
  const current = zoneCountForRound(round, p);
  const next = zoneCountForRound(round + 1, p);
  // Can only continue if the next round would broadcast to strictly more zones.
  return next > current;
}
