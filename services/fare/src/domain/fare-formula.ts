/**
 * Pure fare computation (docs/specs.md §7.1). All money in integer PKR paisa to
 * avoid float error. A ride uses the config version active at its START time
 * (docs/specs.md §7.2) — version selection happens outside this pure function.
 */
export interface FareConfigValues {
  version: number;
  basePaisa: number;
  perKmPaisa: number;
  perMinutePaisa: number;
  minimumPaisa: number;
  rounding: 'nearest_10' | 'none';
  nightMultiplier: number | null;
}

export interface ZoneOverride {
  perKmPaisa?: number;
  perMinutePaisa?: number;
  multiplier?: number;
}

export interface FareInput {
  distanceM: number;
  durationS: number;
  config: FareConfigValues;
  zoneOverride?: ZoneOverride;
  /** True if the ride qualifies for the night multiplier (decided by the caller). */
  isNight?: boolean;
}

export interface FareBreakdown {
  basePaisa: number;
  distanceComponentPaisa: number;
  timeComponentPaisa: number;
  adjustmentsPaisa: number;
  subtotalPaisa: number;
  roundingAdjustmentPaisa: number;
  totalPaisa: number;
  configVersion: number;
}

/**
 * fare = base + per_km*distance_km + per_min*duration_min, floored at minimum,
 * then rounded per the config's rounding rule (docs/specs.md §7.1).
 * Zone overrides replace the per-km/per-min rate and/or apply a multiplier;
 * a night multiplier applies on top when isNight is true.
 */
export function computeFare(input: FareInput): FareBreakdown {
  const { config, zoneOverride, distanceM, durationS } = input;
  const distanceKm = distanceM / 1000;
  const durationMin = durationS / 60;

  const perKm = zoneOverride?.perKmPaisa ?? config.perKmPaisa;
  const perMin = zoneOverride?.perMinutePaisa ?? config.perMinutePaisa;

  let distanceComponentPaisa = perKm * distanceKm;
  let timeComponentPaisa = perMin * durationMin;

  const multiplier =
    (zoneOverride?.multiplier ?? 1) * (input.isNight ? config.nightMultiplier ?? 1 : 1);
  distanceComponentPaisa *= multiplier;
  timeComponentPaisa *= multiplier;

  const basePaisa = config.basePaisa;
  const adjustmentsPaisa = 0; // reserved: waiting charges, promos, etc. (v1: none active)

  const subtotal = basePaisa + distanceComponentPaisa + timeComponentPaisa + adjustmentsPaisa;
  const flooredAtMinimum = Math.max(subtotal, config.minimumPaisa);

  const totalPaisa = roundFare(flooredAtMinimum, config.rounding);
  const roundingAdjustmentPaisa = totalPaisa - flooredAtMinimum;

  return {
    basePaisa: round(basePaisa),
    distanceComponentPaisa: round(distanceComponentPaisa),
    timeComponentPaisa: round(timeComponentPaisa),
    adjustmentsPaisa: round(adjustmentsPaisa),
    subtotalPaisa: round(subtotal),
    roundingAdjustmentPaisa: round(roundingAdjustmentPaisa),
    totalPaisa,
    configVersion: config.version,
  };
}

function roundFare(paisa: number, rule: FareConfigValues['rounding']): number {
  if (rule === 'none') return round(paisa);
  // nearest_10 rupees = nearest 1000 paisa.
  const unit = 1000;
  return Math.round(paisa / unit) * unit;
}

function round(n: number): number {
  return Math.round(n);
}
