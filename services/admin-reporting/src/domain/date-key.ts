/**
 * UTC date bucketing for daily aggregates (docs/data-model.md · 11 reporting_db:
 * rides_daily, driver_performance, violation_summary, payment_mix are all keyed
 * by date). Pure — no timezone-library dependency for a single, well-defined rule.
 */
export function toDateKey(isoOrEpoch: string | number): string {
  const d = typeof isoOrEpoch === 'number' ? new Date(isoOrEpoch) : new Date(isoOrEpoch);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}
