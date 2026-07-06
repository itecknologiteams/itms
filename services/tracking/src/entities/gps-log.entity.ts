import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { PingSource } from '../ingest/ping';

/**
 * tracking_db.gps_logs — durable GPS history (docs/data-model.md · 06).
 * A TimescaleDB hypertable in staging/prod (chunked by day, compressed after 7d);
 * a plain table on the local PostGIS image. Partition key is `time`.
 */
@Entity('gps_logs')
@Index(['vehicleId', 'time'])
export class GpsLog {
  @PrimaryColumn({ type: 'timestamptz' })
  time!: Date;

  @PrimaryColumn({ name: 'vehicle_id', type: 'uuid' })
  vehicleId!: string;

  @Column({ type: 'double precision' })
  lat!: number;

  @Column({ type: 'double precision' })
  lon!: number;

  @Column({ name: 'speed_kmh', type: 'double precision', default: 0 })
  speedKmh!: number;

  @Column({ type: 'double precision', default: 0 })
  heading!: number;

  @Column({ type: 'boolean', default: false })
  ignition!: boolean;

  @Column({ name: 'battery_pct', type: 'double precision', nullable: true })
  batteryPct!: number | null;

  @Column({ type: 'varchar', default: 'tracker' })
  source!: PingSource;
}
