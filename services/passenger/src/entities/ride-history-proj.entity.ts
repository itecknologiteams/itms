import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * passenger_db.ride_history_proj — a local read projection built from ride
 * events (docs/data-model.md · 02). Never written from anywhere but the
 * event consumer; the Ride service remains the system of record.
 */
@Entity('ride_history_proj')
export class RideHistoryProjection {
  @PrimaryColumn({ name: 'ride_id', type: 'uuid' })
  rideId!: string;

  @Index()
  @Column({ name: 'passenger_id', type: 'uuid' })
  passengerId!: string;

  @Column({ name: 'driver_name', type: 'varchar', nullable: true })
  driverName!: string | null;

  @Column({ name: 'plate_no', type: 'varchar', nullable: true })
  plateNo!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @Column({ name: 'distance_m', type: 'double precision', nullable: true })
  distanceM!: number | null;

  @Column({ name: 'duration_s', type: 'int', nullable: true })
  durationS!: number | null;

  @Column({ name: 'fare_paisa', type: 'bigint', nullable: true })
  farePaisa!: string | null;

  @Column({ name: 'payment_method', type: 'varchar', nullable: true })
  paymentMethod!: string | null;

  @Column({ type: 'varchar' })
  status!: string;
}
