import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export enum VehicleStatus {
  Active = 'active',
  Maintenance = 'maintenance',
  Retired = 'retired',
}

/** driver_db.vehicles (docs/data-model.md · 03 driver_db). */
@Entity('vehicles')
export class Vehicle {
  @PrimaryColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'plate_no' })
  plateNo!: string;

  @Column()
  model!: string;

  @Column({ type: 'int', nullable: true })
  year!: number | null;

  @Column({ type: 'varchar', nullable: true })
  color!: string | null;

  @Index({ unique: true })
  @Column({ name: 'tracker_device_id' })
  trackerDeviceId!: string;

  @Column({ type: 'enum', enum: VehicleStatus, default: VehicleStatus.Active })
  status!: VehicleStatus;

  @Column({ name: 'city_id', type: 'uuid', nullable: true })
  cityId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
