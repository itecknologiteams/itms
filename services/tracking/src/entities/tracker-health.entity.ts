import { Column, Entity, PrimaryColumn } from 'typeorm';

export enum TrackerStatus {
  Ok = 'ok',
  Stale = 'stale',
  Dead = 'dead',
}

/** tracking_db.tracker_health — last-seen + health per vehicle tracker (docs/specs.md §9). */
@Entity('tracker_health')
export class TrackerHealth {
  @PrimaryColumn({ name: 'vehicle_id', type: 'uuid' })
  vehicleId!: string;

  @Column({ name: 'device_id', type: 'varchar', nullable: true })
  deviceId!: string | null;

  @Column({ name: 'last_ping_at', type: 'timestamptz' })
  lastPingAt!: Date;

  @Column({ type: 'enum', enum: TrackerStatus, default: TrackerStatus.Ok })
  status!: TrackerStatus;
}
