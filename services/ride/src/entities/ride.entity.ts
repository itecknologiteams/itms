import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { RideStatus } from '../domain/ride-state-machine';

export interface Point {
  lat: number;
  lon: number;
}

export enum PaymentMethod {
  Cash = 'cash',
  JazzCash = 'jazzcash',
  Card = 'card',
}

/** ride_db.rides — the ride record and current state (docs/data-model.md · 07). */
@Entity('rides')
export class Ride {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'passenger_id', type: 'uuid' })
  passengerId!: string;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId!: string | null;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId!: string | null;

  @Index()
  @Column({ type: 'enum', enum: RideStatus, default: RideStatus.Requested })
  status!: RideStatus;

  @Column({ type: 'jsonb', name: 'pickup_point' })
  pickupPoint!: Point;

  @Column({ name: 'pickup_zone_id', type: 'uuid', nullable: true })
  pickupZoneId!: string | null;

  @Column({ type: 'jsonb', name: 'dropoff_point', nullable: true })
  dropoffPoint!: Point | null;

  @Column({ name: 'requested_at', type: 'timestamptz' })
  requestedAt!: Date;

  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true })
  assignedAt!: Date | null;

  @Column({ name: 'arrived_at', type: 'timestamptz', nullable: true })
  arrivedAt!: Date | null;

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

  @Column({ name: 'fare_config_version', type: 'int', nullable: true })
  fareConfigVersion!: number | null;

  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod!: PaymentMethod | null;

  @Column({ name: 'cancel_reason', type: 'varchar', nullable: true })
  cancelReason!: string | null;

  @Column({ name: 'rematch_count', type: 'int', default: 0 })
  rematchCount!: number;

  @Column({ name: 'city_id', type: 'uuid', nullable: true })
  cityId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
