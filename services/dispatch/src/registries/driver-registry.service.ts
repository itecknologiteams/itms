import { Injectable } from '@nestjs/common';

interface DriverState {
  vehicleId: string | null;
  online: boolean;
  onRide: boolean;
}

export interface EligibleDriver {
  driverId: string;
  vehicleId: string;
  zoneId: string;
}

/**
 * In-memory projection of driver eligibility, built from domain events
 * (docs/architecture.md §2). A driver is eligible when online, not on a ride,
 * paired to a zone, and its tracker is fresh. Process-local in v1 (Redis-backed
 * in production for multi-replica dispatch — documented limitation).
 */
@Injectable()
export class DriverRegistry {
  private readonly drivers = new Map<string, DriverState>();
  private readonly vehicleZone = new Map<string, string>();
  private readonly trackerOk = new Map<string, boolean>();

  setOnline(driverId: string, vehicleId: string | null, online: boolean): void {
    const s = this.drivers.get(driverId) ?? { vehicleId: null, online: false, onRide: false };
    s.online = online;
    if (vehicleId) s.vehicleId = vehicleId;
    this.drivers.set(driverId, s);
  }

  setVehicleZone(vehicleId: string, zoneId: string): void {
    this.vehicleZone.set(vehicleId, zoneId);
  }

  setOnRide(driverId: string, onRide: boolean): void {
    const s = this.drivers.get(driverId);
    if (s) s.onRide = onRide;
    else this.drivers.set(driverId, { vehicleId: null, online: false, onRide });
  }

  setTracker(vehicleId: string, ok: boolean): void {
    this.trackerOk.set(vehicleId, ok);
  }

  /** Eligible drivers whose paired zone is in the given set. */
  eligibleInZones(zoneIds: Set<string>): EligibleDriver[] {
    const out: EligibleDriver[] = [];
    for (const [driverId, s] of this.drivers) {
      if (!s.online || s.onRide || !s.vehicleId) continue;
      const zoneId = this.vehicleZone.get(s.vehicleId);
      if (!zoneId || !zoneIds.has(zoneId)) continue;
      if (this.trackerOk.get(s.vehicleId) === false) continue; // stale tracker excluded
      out.push({ driverId, vehicleId: s.vehicleId, zoneId });
    }
    return out;
  }

  /** The vehicle + zone a driver would be assigned with, for the claim path. */
  assignmentFor(driverId: string): { vehicleId: string; zoneId: string } | null {
    const s = this.drivers.get(driverId);
    if (!s?.vehicleId) return null;
    const zoneId = this.vehicleZone.get(s.vehicleId);
    if (!zoneId) return null;
    return { vehicleId: s.vehicleId, zoneId };
  }
}
