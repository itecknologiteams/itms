import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LatLon } from '@itms/common';
import { IsNull, Repository } from 'typeorm';
import { Zone, ZoneStatus } from '../entities/zone.entity';
import { VehicleZonePairing } from '../entities/vehicle-zone-pairing.entity';
import { polygonToRing } from '../geo/ring';

export interface CachedZone {
  zoneId: string;
  ring: LatLon[];
}

/**
 * In-memory cache of active zone geometry and vehicle→zone pairings, refreshed on
 * write and on startup. Powers hot-path containment without a DB hit per ping
 * (docs/specs.md §6.3). In production this cache is backed by Redis so all
 * replicas share it; v1 uses a process-local map (documented limitation).
 */
@Injectable()
export class ZoneRegistry implements OnModuleInit {
  private readonly logger = new Logger(ZoneRegistry.name);
  private zones = new Map<string, CachedZone>();
  private vehicleToZone = new Map<string, string>();

  constructor(
    @InjectRepository(Zone) private readonly zoneRepo: Repository<Zone>,
    @InjectRepository(VehicleZonePairing)
    private readonly pairingRepo: Repository<VehicleZonePairing>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    const zones = await this.zoneRepo.find({ where: { status: ZoneStatus.Active } });
    this.zones = new Map(
      zones.map((z) => [z.id, { zoneId: z.id, ring: polygonToRing(z.boundary) }]),
    );
    const pairings = await this.pairingRepo.find({ where: { toTs: IsNull() } });
    this.vehicleToZone = new Map(pairings.map((p) => [p.vehicleId, p.zoneId]));
    this.logger.log(`Zone cache: ${this.zones.size} active zones, ${this.vehicleToZone.size} pairings`);
  }

  /** The active zone a vehicle is paired to, with its ring; null if unpaired/inactive. */
  getPairedZone(vehicleId: string): CachedZone | null {
    const zoneId = this.vehicleToZone.get(vehicleId);
    if (!zoneId) return null;
    return this.zones.get(zoneId) ?? null;
  }

  setPairing(vehicleId: string, zoneId: string): void {
    this.vehicleToZone.set(vehicleId, zoneId);
  }

  listActiveZones(): CachedZone[] {
    return [...this.zones.values()];
  }
}
