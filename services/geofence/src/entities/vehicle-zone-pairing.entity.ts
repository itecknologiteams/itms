import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * geofence_db.vehicle_zone_pairings — a vehicle's primary-zone assignment over
 * time. The current pairing has to_ts = null (docs/specs.md §6.2).
 */
@Entity('vehicle_zone_pairings')
export class VehicleZonePairing {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId!: string;

  @Column({ name: 'zone_id', type: 'uuid' })
  zoneId!: string;

  @Column({ name: 'from_ts', type: 'timestamptz' })
  fromTs!: Date;

  @Index()
  @Column({ name: 'to_ts', type: 'timestamptz', nullable: true })
  toTs!: Date | null;

  @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
  assignedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
