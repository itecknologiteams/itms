import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { distanceOutsideMeters, DomainRuleError, LatLon, NotFoundError } from '@itms/common';
import { EventNames, OutboxEntity } from '@itms/events';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Zone, ZoneStatus } from '../entities/zone.entity';
import { ZoneVersion } from '../entities/zone-version.entity';
import { VehicleZonePairing } from '../entities/vehicle-zone-pairing.entity';
import { MovementPass } from '../entities/movement-pass.entity';
import { CreateZoneDto, MovementPassDto, UpdateZoneDto } from './dto';
import { isValidPolygon } from '../geo/ring';
import { ZoneRegistry } from './zone-registry.service';

@Injectable()
export class ZonesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Zone) private readonly zones: Repository<Zone>,
    @InjectRepository(VehicleZonePairing) private readonly pairings: Repository<VehicleZonePairing>,
    @InjectRepository(MovementPass) private readonly passes: Repository<MovementPass>,
    private readonly registry: ZoneRegistry,
  ) {}

  async create(dto: CreateZoneDto, adminId?: string): Promise<Zone> {
    if (!isValidPolygon(dto.boundary)) {
      throw new DomainRuleError('INVALID_POLYGON', 'boundary must be a valid GeoJSON Polygon');
    }
    const zone = await this.dataSource.transaction(async (mgr) => {
      const z = await mgr.save(
        mgr.create(Zone, {
          id: uuidv7(),
          name: dto.name,
          boundary: dto.boundary,
          status: ZoneStatus.Active,
          version: 1,
          cityId: dto.city_id ?? null,
        }),
      );
      await mgr.save(
        mgr.create(ZoneVersion, {
          id: uuidv7(),
          zoneId: z.id,
          version: 1,
          boundary: dto.boundary,
          changedBy: adminId ?? null,
        }),
      );
      await this.emit(mgr, EventNames.ZoneUpdated, { zone_id: z.id, version: 1, status: z.status });
      return z;
    });
    await this.registry.reload();
    return zone;
  }

  async update(id: string, dto: UpdateZoneDto, adminId?: string): Promise<Zone> {
    const zone = await this.zones.findOne({ where: { id } });
    if (!zone) throw new NotFoundError('ZONE_NOT_FOUND', 'Zone not found');

    if (dto.boundary && !isValidPolygon(dto.boundary)) {
      throw new DomainRuleError('INVALID_POLYGON', 'boundary must be a valid GeoJSON Polygon');
    }

    const updated = await this.dataSource.transaction(async (mgr) => {
      if (dto.name !== undefined) zone.name = dto.name;
      if (dto.status !== undefined) zone.status = dto.status;
      if (dto.boundary !== undefined) {
        zone.boundary = dto.boundary;
        zone.version += 1;
        await mgr.save(
          mgr.create(ZoneVersion, {
            id: uuidv7(),
            zoneId: zone.id,
            version: zone.version,
            boundary: dto.boundary,
            changedBy: adminId ?? null,
          }),
        );
      }
      await mgr.save(zone);
      await this.emit(mgr, EventNames.ZoneUpdated, {
        zone_id: zone.id,
        version: zone.version,
        status: zone.status,
      });
      return zone;
    });
    await this.registry.reload();
    return updated;
  }

  list(): Promise<Zone[]> {
    return this.zones.find({ order: { createdAt: 'DESC' } });
  }

  async get(id: string): Promise<Zone> {
    const zone = await this.zones.findOne({ where: { id } });
    if (!zone) throw new NotFoundError('ZONE_NOT_FOUND', 'Zone not found');
    return zone;
  }

  /** Re-pair a vehicle to a zone: close the current open pairing, open a new one. */
  async pairVehicle(vehicleId: string, zoneId: string, adminId?: string): Promise<void> {
    const zone = await this.zones.findOne({ where: { id: zoneId } });
    if (!zone) throw new NotFoundError('ZONE_NOT_FOUND', 'Zone not found');

    await this.dataSource.transaction(async (mgr) => {
      await mgr.update(
        VehicleZonePairing,
        { vehicleId, toTs: IsNull() },
        { toTs: new Date() },
      );
      await mgr.save(
        mgr.create(VehicleZonePairing, {
          id: uuidv7(),
          vehicleId,
          zoneId,
          fromTs: new Date(),
          toTs: null,
          assignedBy: adminId ?? null,
        }),
      );
      // Dispatch's eligibility projection learns a vehicle's zone from this
      // event (docs/architecture.md §2) — without it, a newly paired vehicle
      // is never eligible for offers.
      await this.emit(mgr, EventNames.VehicleUpdated, {
        vehicle_id: vehicleId,
        paired_zone_id: zoneId,
      });
    });
    this.registry.setPairing(vehicleId, zoneId);
  }

  async vehiclesInZone(zoneId: string): Promise<string[]> {
    const rows = await this.pairings.find({ where: { zoneId, toTs: IsNull() } });
    return rows.map((r) => r.vehicleId);
  }

  createMovementPass(dto: MovementPassDto, adminId?: string): Promise<MovementPass> {
    const from = new Date(dto.from_ts);
    const to = new Date(dto.to_ts);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || to <= from) {
      throw new DomainRuleError('INVALID_WINDOW', 'to_ts must be after from_ts');
    }
    return this.passes.save(
      this.passes.create({
        id: uuidv7(),
        vehicleId: dto.vehicle_id,
        reason: dto.reason,
        grantedBy: adminId ?? null,
        fromTs: from,
        toTs: to,
      }),
    );
  }

  /** Answer the passenger app's "am I in a service zone?" check. */
  checkPoint(lat: number, lon: number): { in_service_zone: boolean; zone_id: string | null } {
    const point = { lat, lon };
    for (const z of this.registry.listActiveZones()) {
      if (distanceInside(point, z.ring)) return { in_service_zone: true, zone_id: z.zoneId };
    }
    return { in_service_zone: false, zone_id: null };
  }

  private async emit(
    mgr: EntityManager,
    eventName: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await mgr.save(
      mgr.create(OutboxEntity, { id: uuidv7(), eventName, payload, sentAt: null }),
    );
  }
}

function distanceInside(point: LatLon, ring: LatLon[]): boolean {
  return distanceOutsideMeters(point, ring) === 0;
}
