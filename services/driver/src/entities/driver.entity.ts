import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export enum DriverStatus {
  Pending = 'pending',
  Approved = 'approved',
  Suspended = 'suspended',
  Retired = 'retired',
}

export enum OnlineStatus {
  Offline = 'offline',
  Online = 'online',
  OnTrip = 'on_trip',
}

/** driver_db.drivers (docs/data-model.md · 03 driver_db). */
@Entity('drivers')
export class Driver {
  @PrimaryColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'auth_user_id', type: 'uuid' })
  authUserId!: string;

  @Column()
  name!: string;

  @Index({ unique: true })
  @Column()
  phone!: string;

  @Column({ type: 'varchar', nullable: true })
  cnic!: string | null;

  @Column({ name: 'license_no', type: 'varchar', nullable: true })
  licenseNo!: string | null;

  @Column({ name: 'license_expiry', type: 'date', nullable: true })
  licenseExpiry!: string | null;

  @Column({ name: 'photo_doc_id', type: 'uuid', nullable: true })
  photoDocId!: string | null;

  @Index()
  @Column({ type: 'enum', enum: DriverStatus, default: DriverStatus.Pending })
  status!: DriverStatus;

  @Column({ type: 'enum', enum: OnlineStatus, default: OnlineStatus.Offline })
  online!: OnlineStatus;

  @Column({ name: 'current_vehicle_id', type: 'uuid', nullable: true })
  currentVehicleId!: string | null;

  @Column({ name: 'rating_avg', type: 'numeric', default: 0 })
  ratingAvg!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
