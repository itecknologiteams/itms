/**
 * Per-vehicle publish throttle (docs/specs.md §9; architecture.md §2). Raw pings
 * arrive every 5–10 s, but the GPS firehose does NOT go on the event bus — only a
 * sampled `vehicle.location.updated` (default every 30 s per vehicle) for consumers
 * like Geofence and the admin map. Pure and unit-testable.
 */
export class SamplingThrottle {
  private readonly lastPublished = new Map<string, number>();

  constructor(private readonly intervalMs: number) {}

  /** Returns true if enough time has elapsed since this vehicle last published. */
  shouldPublish(vehicleId: string, now: number): boolean {
    const last = this.lastPublished.get(vehicleId);
    if (last === undefined || now - last >= this.intervalMs) {
      this.lastPublished.set(vehicleId, now);
      return true;
    }
    return false;
  }

  reset(vehicleId: string): void {
    this.lastPublished.delete(vehicleId);
  }
}
