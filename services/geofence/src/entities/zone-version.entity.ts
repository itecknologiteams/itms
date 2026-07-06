import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { GeoJsonPolygon } from './zone.entity';

/** geofence_db.zone_versions — audit of every boundary/status change (docs/specs.md §6.1). */
@Entity('zone_versions')
export class ZoneVersion {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'zone_id', type: 'uuid' })
  zoneId!: string;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'jsonb' })
  boundary!: GeoJsonPolygon;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy!: string | null;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  changedAt!: Date;
}
