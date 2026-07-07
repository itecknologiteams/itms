import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { NotFoundError } from '@itms/common';
import { EventNames, OutboxEntity } from '@itms/events';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { FareConfigEntity, RoundingRule } from '../entities/fare-config.entity';
import { ZoneFareOverride } from '../entities/zone-fare-override.entity';
import { FareConfigValues, ZoneOverride } from '../domain/fare-formula';
import { CreateFareConfigDto } from './dto';

@Injectable()
export class FareConfigService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(FareConfigEntity) private readonly configs: Repository<FareConfigEntity>,
    @InjectRepository(ZoneFareOverride) private readonly overrides: Repository<ZoneFareOverride>,
  ) {}

  list(): Promise<FareConfigEntity[]> {
    return this.configs.find({ order: { version: 'DESC' } });
  }

  /**
   * Create a new versioned config. Configs are never edited in place
   * (docs/specs.md §7.2) — this always inserts version = max(version) + 1.
   */
  async create(dto: CreateFareConfigDto, adminId?: string): Promise<FareConfigEntity> {
    return this.dataSource.transaction(async (mgr) => {
      const latest = await mgr
        .getRepository(FareConfigEntity)
        .createQueryBuilder('c')
        .orderBy('c.version', 'DESC')
        .getOne();
      const version = (latest?.version ?? 0) + 1;

      const entity = mgr.create(FareConfigEntity, {
        id: uuidv7(),
        version,
        basePaisa: String(dto.base_paisa),
        perKmPaisa: String(dto.per_km_paisa),
        perMinPaisa: String(dto.per_min_paisa),
        minimumPaisa: String(dto.minimum_paisa),
        rounding: dto.rounding ?? RoundingRule.Nearest10,
        nightMultiplier: dto.night_multiplier !== undefined ? String(dto.night_multiplier) : null,
        effectiveFrom: new Date(),
        createdBy: adminId ?? null,
      });
      await mgr.save(entity);
      await mgr.save(
        mgr.create(OutboxEntity, {
          id: uuidv7(),
          eventName: EventNames.FareConfigChanged,
          payload: { version, effective_from: entity.effectiveFrom.toISOString(), changed_by: adminId },
          sentAt: null,
        }),
      );
      return entity;
    });
  }

  /** The config active at a given point in time (ride start), per §7.2. */
  async activeAt(at: Date): Promise<FareConfigEntity> {
    const config = await this.configs.findOne({
      where: { effectiveFrom: LessThanOrEqual(at) },
      order: { effectiveFrom: 'DESC' },
    });
    if (!config) throw new NotFoundError('NO_FARE_CONFIG', 'No fare configuration is active');
    return config;
  }

  async overrideFor(version: number, zoneId: string | null): Promise<ZoneOverride | undefined> {
    if (!zoneId) return undefined;
    const row = await this.overrides.findOne({ where: { fareConfigVersion: version, zoneId } });
    if (!row) return undefined;
    return {
      perKmPaisa: row.perKmPaisa ? Number(row.perKmPaisa) : undefined,
      perMinutePaisa: row.perMinPaisa ? Number(row.perMinPaisa) : undefined,
      multiplier: row.multiplier ? Number(row.multiplier) : undefined,
    };
  }

  toValues(entity: FareConfigEntity): FareConfigValues {
    return {
      version: entity.version,
      basePaisa: Number(entity.basePaisa),
      perKmPaisa: Number(entity.perKmPaisa),
      perMinutePaisa: Number(entity.perMinPaisa),
      minimumPaisa: Number(entity.minimumPaisa),
      rounding: entity.rounding,
      nightMultiplier: entity.nightMultiplier ? Number(entity.nightMultiplier) : null,
    };
  }
}
