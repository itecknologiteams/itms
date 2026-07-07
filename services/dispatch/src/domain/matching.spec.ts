import { LatLon } from '@itms/common';
import { rankZonesByDistance, zonesForRound, ZoneGeometry } from './zone-selection';
import { ExpansionParams, shouldContinue, zoneCountForRound } from './expansion';

// Four small square zones marching east from the pickup.
function square(centerLon: number): LatLon[] {
  const lat = 24.8;
  const d = 0.005;
  return [
    { lat: lat - d, lon: centerLon - d },
    { lat: lat - d, lon: centerLon + d },
    { lat: lat + d, lon: centerLon + d },
    { lat: lat + d, lon: centerLon - d },
  ];
}
const zones: ZoneGeometry[] = [
  { zoneId: 'z0', ring: square(67.0) },
  { zoneId: 'z1', ring: square(67.05) },
  { zoneId: 'z2', ring: square(67.1) },
  { zoneId: 'z3', ring: square(67.2) },
];
const pickup: LatLon = { lat: 24.8, lon: 67.0 };

describe('rankZonesByDistance', () => {
  it('orders zones nearest-first, 0 distance when inside', () => {
    const ranked = rankZonesByDistance(pickup, zones);
    expect(ranked.map((r) => r.zoneId)).toEqual(['z0', 'z1', 'z2', 'z3']);
    expect(ranked[0].distanceM).toBe(0); // pickup is inside z0
    expect(ranked[1].distanceM).toBeGreaterThan(0);
  });
});

describe('zonesForRound', () => {
  const ranked = rankZonesByDistance(pickup, zones);
  it('round 1 selects the initial N nearest', () => {
    expect(zonesForRound(ranked, 1, 3, 6)).toEqual(['z0', 'z1', 'z2']);
  });
  it('each round adds one more zone', () => {
    expect(zonesForRound(ranked, 2, 3, 6)).toEqual(['z0', 'z1', 'z2', 'z3']);
  });
  it('never exceeds available zones', () => {
    expect(zonesForRound(ranked, 5, 3, 6)).toHaveLength(4);
  });
});

describe('expansion policy', () => {
  const p: ExpansionParams = {
    initialZones: 3,
    maxZones: 6,
    offerMs: 15_000,
    maxTotalWaitMs: 90_000,
    availableZoneCount: 6,
  };

  it('grows one zone per round up to the cap', () => {
    expect(zoneCountForRound(1, p)).toBe(3);
    expect(zoneCountForRound(2, p)).toBe(4);
    expect(zoneCountForRound(4, p)).toBe(6);
    expect(zoneCountForRound(5, p)).toBe(6); // capped at maxZones
  });

  it('stops when the total wait cap would be exceeded', () => {
    expect(shouldContinue(1, 0, p)).toBe(true);
    expect(shouldContinue(1, 80_000, p)).toBe(false); // 80s + 15s > 90s
  });

  it('keeps retrying the same maximal zone set once zones can no longer grow', () => {
    const small = { ...p, availableZoneCount: 3 };
    // Only 3 zones exist: round 1 already covers all, no further expansion is
    // possible, but matching should still keep re-broadcasting to that set
    // until the time budget runs out — eligibility is eventually consistent,
    // so a driver missed in round 1 may be indexed in time for round 2.
    expect(shouldContinue(1, 0, small)).toBe(true);
    expect(zoneCountForRound(1, small)).toBe(3);
    expect(zoneCountForRound(2, small)).toBe(3);
  });
});
