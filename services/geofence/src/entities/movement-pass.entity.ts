import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * geofence_db.movement_passes — a time-boxed admin authorization for a vehicle to
 * be out of its zone (maintenance, reassignment) without raising a violation
 * (docs/specs.md §6.4).
 */
@Entity('movement_passes')
export class MovementPass {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId!: string;

  @Column()
  reason!: string;

  @Column({ name: 'granted_by', type: 'uuid', nullable: true })
  grantedBy!: string | null;

  @Column({ name: 'from_ts', type: 'timestamptz' })
  fromTs!: Date;

  @Column({ name: 'to_ts', type: 'timestamptz' })
  toTs!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
