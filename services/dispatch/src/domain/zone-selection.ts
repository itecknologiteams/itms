import { distanceToZoneMeters, LatLon } from '@itms/common';

export interface ZoneGeometry {
  zoneId: string;
  ring: LatLon[];
}

export interface RankedZone {
  zoneId: string;
  distanceM: number;
}

/**
 * Rank active zones by straight-line distance from the pickup point (0 if the
 * point is inside the zone), nearest first (docs/specs.md §5.1). The dispatch
 * engine then broadcasts to the N nearest and expands outward one at a time.
 */
export function rankZonesByDistance(pickup: LatLon, zones: ZoneGeometry[]): RankedZone[] {
  return zones
    .map((z) => ({ zoneId: z.zoneId, distanceM: distanceToZoneMeters(pickup, z.ring) }))
    .sort((a, b) => a.distanceM - b.distanceM);
}

/** The zone ids to include for a given round (1-based): initialZones + (round-1), capped. */
export function zonesForRound(
  ranked: RankedZone[],
  round: number,
  initialZones: number,
  maxZones: number,
): string[] {
  const count = Math.min(initialZones + (round - 1), maxZones, ranked.length);
  return ranked.slice(0, count).map((z) => z.zoneId);
}
