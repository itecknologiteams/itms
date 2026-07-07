import { Column, Entity, PrimaryColumn } from 'typeorm';

/** reporting_db.rides_daily — CQRS read model (docs/data-model.md · 11). */
@Entity('rides_daily')
export class RidesDaily {
  @PrimaryColumn({ type: 'date' })
  date!: string;

  @PrimaryColumn({ name: 'zone_id', type: 'uuid', default: '00000000-0000-0000-0000-000000000000' })
  zoneId!: string;

  @Column({ name: 'city_id', type: 'uuid', nullable: true })
  cityId!: string | null;

  @Column({ name: 'rides_completed', type: 'int', default: 0 })
  ridesCompleted!: number;

  @Column({ name: 'rides_cancelled', type: 'int', default: 0 })
  ridesCancelled!: number;

  @Column({ name: 'no_driver_count', type: 'int', default: 0 })
  noDriverCount!: number;

  @Column({ name: 'revenue_paisa', type: 'bigint', default: 0 })
  revenuePaisa!: string;

  @Column({ name: 'avg_fare_paisa', type: 'double precision', default: 0 })
  avgFarePaisa!: number;

  @Column({ name: 'avg_match_seconds', type: 'double precision', default: 0 })
  avgMatchSeconds!: number;
}
