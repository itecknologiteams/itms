import { toDateKey } from './date-key';
import { hoursBetween, nextAverage } from './running-stats';

describe('toDateKey', () => {
  it('formats an ISO timestamp as YYYY-MM-DD in UTC', () => {
    expect(toDateKey('2026-07-06T23:59:59.000Z')).toBe('2026-07-06');
  });
  it('formats an epoch-ms timestamp', () => {
    expect(toDateKey(Date.UTC(2026, 0, 15))).toBe('2026-01-15');
  });
});

describe('nextAverage', () => {
  it('returns the value itself when there is no prior history', () => {
    expect(nextAverage(0, 0, 42)).toBe(42);
  });
  it('computes a correct running average', () => {
    // avg of [10, 20] = 15
    const afterFirst = nextAverage(0, 0, 10);
    const afterSecond = nextAverage(afterFirst, 1, 20);
    expect(afterSecond).toBe(15);
  });
  it('matches a manually computed average over several updates', () => {
    let avg = 0;
    let count = 0;
    for (const v of [4, 8, 15, 16, 23, 42]) {
      avg = nextAverage(avg, count, v);
      count += 1;
    }
    const expected = (4 + 8 + 15 + 16 + 23 + 42) / 6;
    expect(avg).toBeCloseTo(expected, 9);
  });
});

describe('hoursBetween', () => {
  it('computes elapsed hours', () => {
    expect(hoursBetween(0, 3_600_000 * 2.5)).toBe(2.5);
  });
  it('floors at 0 for out-of-order timestamps', () => {
    expect(hoursBetween(10_000, 0)).toBe(0);
  });
});
