/**
 * Pure incremental-average arithmetic for streaming aggregates (docs/data-model.md
 * · 11 reporting_db: avg_fare_paisa, avg_match_seconds, rating_avg). Avoids
 * re-summing the full history on every event.
 */
export function nextAverage(oldAvg: number, oldCount: number, newValue: number): number {
  if (oldCount <= 0) return newValue;
  return (oldAvg * oldCount + newValue) / (oldCount + 1);
}

/** Elapsed hours between two epoch-ms timestamps, floored at 0 (clock-skew guard). */
export function hoursBetween(startMs: number, endMs: number): number {
  return Math.max(0, (endMs - startMs) / 3_600_000);
}
