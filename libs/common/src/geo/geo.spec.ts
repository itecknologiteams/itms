import {
  distanceOutsideMeters,
  distanceToBoundaryMeters,
  haversineMeters,
  pointInPolygon,
  LatLon,
  PolygonRing,
} from './geo';

// A ~1.1km square around a point in Karachi (Clifton-ish), for realism.
const square: PolygonRing = [
  { lat: 24.8, lon: 67.02 },
  { lat: 24.8, lon: 67.03 },
  { lat: 24.81, lon: 67.03 },
  { lat: 24.81, lon: 67.02 },
];

describe('haversineMeters', () => {
  it('is ~0 for identical points', () => {
    expect(haversineMeters({ lat: 24.8, lon: 67.0 }, { lat: 24.8, lon: 67.0 })).toBeCloseTo(0, 5);
  });

  it('matches a known distance (~1 degree lat ≈ 111 km)', () => {
    const d = haversineMeters({ lat: 0, lon: 0 }, { lat: 1, lon: 0 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });
});

describe('pointInPolygon', () => {
  it('detects an interior point', () => {
    expect(pointInPolygon({ lat: 24.805, lon: 67.025 }, square)).toBe(true);
  });

  it('rejects an exterior point', () => {
    expect(pointInPolygon({ lat: 24.79, lon: 67.025 }, square)).toBe(false);
    expect(pointInPolygon({ lat: 24.805, lon: 67.05 }, square)).toBe(false);
  });
});

describe('distanceToBoundaryMeters', () => {
  it('is small for a point near an edge', () => {
    // Just inside the southern edge (lat 24.8), centred in lon.
    const d = distanceToBoundaryMeters({ lat: 24.8005, lon: 67.025 }, square);
    expect(d).toBeLessThan(80);
  });
});

describe('distanceOutsideMeters (hysteresis input)', () => {
  it('returns 0 when inside', () => {
    expect(distanceOutsideMeters({ lat: 24.805, lon: 67.025 }, square)).toBe(0);
  });

  it('returns a positive metre distance when outside', () => {
    // ~5 thousandths of a degree lat south of the edge ≈ ~55 m.
    const p: LatLon = { lat: 24.7995, lon: 67.025 };
    const d = distanceOutsideMeters(p, square);
    expect(d).toBeGreaterThan(40);
    expect(d).toBeLessThan(70);
  });

  it('grows with distance from the zone', () => {
    const near = distanceOutsideMeters({ lat: 24.799, lon: 67.025 }, square);
    const far = distanceOutsideMeters({ lat: 24.79, lon: 67.025 }, square);
    expect(far).toBeGreaterThan(near);
  });
});
