import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/** fare_db.fare_calculations — the computed breakdown for a ride, immutable audit record. */
@Entity('fare_calculations')
export class FareCalculation {
  @PrimaryColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'ride_id', type: 'uuid' })
  rideId!: string;

  @Column({ name: 'fare_config_version', type: 'int' })
  fareConfigVersion!: number;

  @Column({ name: 'distance_m', type: 'double precision' })
  distanceM!: number;

  @Column({ name: 'duration_s', type: 'int' })
  durationS!: number;

  @Column({ name: 'base_paisa', type: 'bigint' })
  basePaisa!: string;

  @Column({ name: 'distance_component_paisa', type: 'bigint' })
  distanceComponentPaisa!: string;

  @Column({ name: 'time_component_paisa', type: 'bigint' })
  timeComponentPaisa!: string;

  @Column({ type: 'jsonb', default: {} })
  adjustments!: Record<string, unknown>;

  @Column({ name: 'total_paisa', type: 'bigint' })
  totalPaisa!: string;

  @CreateDateColumn({ name: 'computed_at', type: 'timestamptz' })
  computedAt!: Date;
}
