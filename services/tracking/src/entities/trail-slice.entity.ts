import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * tracking_db.trail_slices — the GPS trail bound to a single ride, used for fare,
 * replay, and disputes (docs/specs.md §9). Computed on ride end.
 */
@Entity('trail_slices')
export class TrailSlice {
  @PrimaryColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'ride_id', type: 'uuid' })
  rideId!: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId!: string;

  @Column({ name: 'from_ts', type: 'timestamptz' })
  fromTs!: Date;

  @Column({ name: 'to_ts', type: 'timestamptz' })
  toTs!: Date;

  @Column({ name: 'distance_m', type: 'double precision', default: 0 })
  distanceM!: number;

  @Column({ name: 'point_count', type: 'int', default: 0 })
  pointCount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
