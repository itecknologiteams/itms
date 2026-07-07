import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/** driver_db.driver_vehicle_assignments — assignment history (docs/data-model.md · 03). */
@Entity('driver_vehicle_assignments')
export class DriverVehicleAssignment {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @Index()
  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId!: string;

  @Column({ name: 'from_ts', type: 'timestamptz' })
  fromTs!: Date;

  @Column({ name: 'to_ts', type: 'timestamptz', nullable: true })
  toTs!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
