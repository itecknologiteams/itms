import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

export enum ViolationStatus {
  Open = 'open',
  AutoClosed = 'auto_closed',
  Acknowledged = 'acknowledged',
  Resolved = 'resolved',
  Escalated = 'escalated',
}

/** geofence_db.violations — an out-of-zone incident and its lifecycle (docs/specs.md §6.5). */
@Entity('violations')
@Index(['vehicleId', 'openedAt'])
export class Violation {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId!: string;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId!: string | null;

  @Column({ name: 'zone_id', type: 'uuid' })
  zoneId!: string;

  @Index()
  @Column({ type: 'enum', enum: ViolationStatus, default: ViolationStatus.Open })
  status!: ViolationStatus;

  @Column({ name: 'opened_at', type: 'timestamptz' })
  openedAt!: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  @Column({ name: 'max_distance_m', type: 'double precision', default: 0 })
  maxDistanceM!: number;

  @Column({ name: 'ack_by', type: 'uuid', nullable: true })
  ackBy!: string | null;

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
