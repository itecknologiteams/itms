import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** fare_db.zone_fare_overrides — per-zone rate/multiplier override for a config version. */
@Entity('zone_fare_overrides')
export class ZoneFareOverride {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'fare_config_version', type: 'int' })
  fareConfigVersion!: number;

  @Index()
  @Column({ name: 'zone_id', type: 'uuid' })
  zoneId!: string;

  @Column({ name: 'per_km_paisa', type: 'bigint', nullable: true })
  perKmPaisa!: string | null;

  @Column({ name: 'per_min_paisa', type: 'bigint', nullable: true })
  perMinPaisa!: string | null;

  @Column({ type: 'numeric', nullable: true })
  multiplier!: string | null;
}
