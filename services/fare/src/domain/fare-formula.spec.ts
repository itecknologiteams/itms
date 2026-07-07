import { computeFare, FareConfigValues } from './fare-formula';

const baseConfig: FareConfigValues = {
  version: 1,
  basePaisa: 10000, // PKR 100
  perKmPaisa: 5000, // PKR 50/km
  perMinutePaisa: 200, // PKR 2/min
  minimumPaisa: 15000, // PKR 150
  rounding: 'nearest_10',
  nightMultiplier: 1.25,
};

describe('computeFare', () => {
  it('computes base + distance + time for a normal trip', () => {
    const r = computeFare({ distanceM: 5000, durationS: 600, config: baseConfig }); // 5km, 10min
    // 10000 + 5000*5 + 200*10 = 10000 + 25000 + 2000 = 37000
    expect(r.basePaisa).toBe(10000);
    expect(r.distanceComponentPaisa).toBe(25000);
    expect(r.timeComponentPaisa).toBe(2000);
    expect(r.subtotalPaisa).toBe(37000);
    expect(r.totalPaisa).toBe(37000); // already a multiple of 1000 (nearest 10 PKR)
    expect(r.configVersion).toBe(1);
  });

  it('applies the minimum fare floor for a very short trip', () => {
    const r = computeFare({ distanceM: 200, durationS: 60, config: baseConfig });
    // 10000 + 1000 + 200 = 11200 < minimum 15000 -> subtotal stays raw, total is floored
    expect(r.subtotalPaisa).toBe(11200);
    expect(r.totalPaisa).toBe(15000);
  });

  it('rounds to the nearest 10 PKR (1000 paisa)', () => {
    const cfg = { ...baseConfig, basePaisa: 10030 }; // introduces a non-round subtotal
    const r = computeFare({ distanceM: 0, durationS: 0, config: cfg });
    // subtotal = max(10030, 15000) = 15000 -> already round; use a case that isn't
    expect(r.totalPaisa % 1000).toBe(0);
  });

  it('rounds a genuinely uneven subtotal to the nearest 1000 paisa', () => {
    const cfg: FareConfigValues = { ...baseConfig, minimumPaisa: 0, basePaisa: 10450 };
    const r = computeFare({ distanceM: 0, durationS: 0, config: cfg });
    expect(r.subtotalPaisa).toBe(10450);
    expect(r.totalPaisa).toBe(10000); // nearest 1000 to 10450
    expect(r.roundingAdjustmentPaisa).toBe(-450);
  });

  it('applies a zone override rate in place of the base rate', () => {
    const r = computeFare({
      distanceM: 2000,
      durationS: 0,
      config: baseConfig,
      zoneOverride: { perKmPaisa: 8000 },
    });
    // 10000 + 8000*2 = 26000
    expect(r.distanceComponentPaisa).toBe(16000);
    expect(r.subtotalPaisa).toBe(26000);
  });

  it('applies the night multiplier on top of the zone multiplier', () => {
    const r = computeFare({
      distanceM: 1000,
      durationS: 0,
      config: baseConfig,
      zoneOverride: { multiplier: 2 },
      isNight: true,
    });
    // distance component = 5000 * 1km * (2 * 1.25) = 12500
    expect(r.distanceComponentPaisa).toBe(12500);
  });

  it('skips rounding entirely when rounding=none', () => {
    const cfg: FareConfigValues = { ...baseConfig, rounding: 'none', minimumPaisa: 0, basePaisa: 111 };
    const r = computeFare({ distanceM: 0, durationS: 0, config: cfg });
    expect(r.totalPaisa).toBe(111);
    expect(r.roundingAdjustmentPaisa).toBe(0);
  });

  it('is deterministic: same inputs produce the same output', () => {
    const a = computeFare({ distanceM: 7345, durationS: 812, config: baseConfig });
    const b = computeFare({ distanceM: 7345, durationS: 812, config: baseConfig });
    expect(a).toEqual(b);
  });
});
