/**
 * Zone-expansion policy for matching rounds (docs/specs.md §5.3). Round 1 uses the
 * initial N nearest zones; each subsequent round adds one more zone, up to
 * maxZones or the number of zones that actually exist. Matching stops when a
 * driver accepts or the total wait cap is hit — NOT merely because the zone
 * set has stopped growing: once it reaches its maximum, later rounds keep
 * re-broadcasting to that same (already-maximal) set, since eligibility is
 * eventually consistent (driver-online/vehicle-pairing events can arrive a
 * beat after the ride was requested) and a driver who wasn't yet indexed in
 * round 1 may well be by round 2.
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
 * Stops only when another full offer window wouldn't fit inside the total
 * wait cap — never because the candidate zone set itself stopped growing.
 */
export function shouldContinue(_round: number, elapsedMs: number, p: ExpansionParams): boolean {
  return elapsedMs + p.offerMs <= p.maxTotalWaitMs;
}
