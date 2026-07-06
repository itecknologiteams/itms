/**
 * Pure-TypeScript geospatial helpers for hot-path containment and hysteresis
 * (docs/specs.md §6.3). PostGIS remains the source of truth for zone geometry;
 * these functions operate on cached geometry to avoid a DB round-trip per ping
 * and are fully unit-testable without infrastructure.
 *
 * Coordinates are { lat, lon } in WGS84 degrees. Distances are in metres.
 */

export interface LatLon {
  lat: number;
  lon: number;
}

/** A polygon ring as an ordered list of vertices (last need not repeat first). */
export type PolygonRing = LatLon[];

const EARTH_RADIUS_M = 6_371_008.8;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two points, in metres (haversine). */
export function haversineMeters(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Point-in-polygon via ray casting. Points exactly on an edge are treated as
 * inside. Assumes a simple (non-self-intersecting) ring.
 */
export function pointInPolygon(point: LatLon, ring: PolygonRing): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i].lon;
    const yi = ring[i].lat;
    const xj = ring[j].lon;
    const yj = ring[j].lat;
    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lon < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Perpendicular distance (metres) from a point to a segment, via local planar projection. */
function distanceToSegmentMeters(p: LatLon, a: LatLon, b: LatLon): number {
  // Project to a local equirectangular plane centred on p (good for short spans).
  const latRef = toRad(p.lat);
  const mPerDegLat = 111_132.92;
  const mPerDegLon = 111_412.84 * Math.cos(latRef);
  const px = 0;
  const py = 0;
  const ax = (a.lon - p.lon) * mPerDegLon;
  const ay = (a.lat - p.lat) * mPerDegLat;
  const bx = (b.lon - p.lon) * mPerDegLon;
  const by = (b.lat - p.lat) * mPerDegLat;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Shortest distance (metres) from a point to a polygon's boundary edges. */
export function distanceToBoundaryMeters(point: LatLon, ring: PolygonRing): number {
  let min = Infinity;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const d = distanceToSegmentMeters(point, ring[j], ring[i]);
    if (d < min) min = d;
  }
  return min;
}

/**
 * Signed distance to a zone: 0 when inside, otherwise the positive distance
 * (metres) to the nearest boundary edge. Used by hysteresis: a vehicle is
 * "outside" only when this exceeds the configured margin.
 */
export function distanceOutsideMeters(point: LatLon, ring: PolygonRing): number {
  if (pointInPolygon(point, ring)) return 0;
  return distanceToBoundaryMeters(point, ring);
}

/** Distance (metres) from a point to the nearest point of a zone (0 if inside). */
export function distanceToZoneMeters(point: LatLon, ring: PolygonRing): number {
  return distanceOutsideMeters(point, ring);
}
