/**
 * Normalized GPS ping and validation (docs/specs.md §9). The MQTT adapter parses
 * raw tracker payloads into this shape; the tracking pipeline works only with it.
 */
export type PingSource = 'tracker' | 'driver_app';

export interface NormalizedPing {
  vehicleId: string;
  lat: number;
  lon: number;
  speedKmh: number;
  heading: number;
  ignition: boolean;
  batteryPct: number | null;
  ts: number; // epoch ms
  source: PingSource;
}

export interface RawTrackerPayload {
  lat?: number;
  lon?: number;
  speed?: number;
  heading?: number;
  ignition?: boolean;
  battery?: number;
  ts?: number | string;
}

/** True for a plausible WGS84 coordinate. */
export function isValidCoord(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    !(lat === 0 && lon === 0) // null-island: almost always a bad fix
  );
}

/**
 * Parse a raw tracker payload into a NormalizedPing, or null if unusable.
 * Defensive against missing/garbage fields from heterogeneous hardware (OPEN-4).
 */
export function normalize(
  vehicleId: string,
  raw: RawTrackerPayload,
  source: PingSource,
  now: number,
): NormalizedPing | null {
  const lat = Number(raw.lat);
  const lon = Number(raw.lon);
  if (!isValidCoord(lat, lon)) return null;

  let ts = now;
  if (typeof raw.ts === 'number') ts = raw.ts;
  else if (typeof raw.ts === 'string') {
    const parsed = Date.parse(raw.ts);
    if (!Number.isNaN(parsed)) ts = parsed;
  }
  // Reject timestamps absurdly in the future (clock skew guard).
  if (ts > now + 60_000) ts = now;

  return {
    vehicleId,
    lat,
    lon,
    speedKmh: clampNumber(raw.speed, 0, 300, 0),
    heading: clampNumber(raw.heading, 0, 360, 0),
    ignition: Boolean(raw.ignition),
    batteryPct: raw.battery === undefined ? null : clampNumber(raw.battery, 0, 100, 0),
    ts,
    source,
  };
}

function clampNumber(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
