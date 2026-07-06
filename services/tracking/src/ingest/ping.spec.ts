import { isValidCoord, normalize } from './ping';
import { SamplingThrottle } from './sampling-throttle';

describe('isValidCoord', () => {
  it('accepts a real coordinate', () => {
    expect(isValidCoord(24.86, 67.0)).toBe(true);
  });
  it('rejects out-of-range and null-island', () => {
    expect(isValidCoord(91, 0)).toBe(false);
    expect(isValidCoord(0, 0)).toBe(false);
    expect(isValidCoord(NaN, 5)).toBe(false);
  });
});

describe('normalize', () => {
  const now = 1_000_000;

  it('normalizes a good payload', () => {
    const p = normalize('v1', { lat: 24.8, lon: 67.0, speed: 40, heading: 90, battery: 80 }, 'tracker', now);
    expect(p).not.toBeNull();
    expect(p!.vehicleId).toBe('v1');
    expect(p!.speedKmh).toBe(40);
    expect(p!.batteryPct).toBe(80);
    expect(p!.ts).toBe(now);
  });

  it('returns null for bad coordinates', () => {
    expect(normalize('v1', { lat: 0, lon: 0 }, 'tracker', now)).toBeNull();
    expect(normalize('v1', {}, 'tracker', now)).toBeNull();
  });

  it('clamps implausible speed and defaults missing fields', () => {
    const p = normalize('v1', { lat: 24.8, lon: 67, speed: 9999 }, 'tracker', now);
    expect(p!.speedKmh).toBe(300);
    expect(p!.heading).toBe(0);
    expect(p!.batteryPct).toBeNull();
    expect(p!.ignition).toBe(false);
  });

  it('guards against far-future timestamps', () => {
    const p = normalize('v1', { lat: 24.8, lon: 67, ts: now + 10_000_000 }, 'tracker', now);
    expect(p!.ts).toBe(now);
  });
});

describe('SamplingThrottle', () => {
  it('publishes the first ping then throttles within the interval', () => {
    const t = new SamplingThrottle(30_000);
    expect(t.shouldPublish('v1', 0)).toBe(true);
    expect(t.shouldPublish('v1', 10_000)).toBe(false);
    expect(t.shouldPublish('v1', 29_999)).toBe(false);
    expect(t.shouldPublish('v1', 30_000)).toBe(true);
  });

  it('tracks vehicles independently', () => {
    const t = new SamplingThrottle(30_000);
    expect(t.shouldPublish('v1', 0)).toBe(true);
    expect(t.shouldPublish('v2', 0)).toBe(true);
    expect(t.shouldPublish('v1', 5_000)).toBe(false);
  });
});
