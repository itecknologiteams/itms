import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export enum ZoneStatus {
  Active = 'active',
  Inactive = 'inactive',
}

/** GeoJSON Polygon: coordinates are [lon, lat] rings (outer ring first). */
export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

/**
 * geofence_db.zones — an operating zone. `boundary` is the authoritative GeoJSON
 * used by the app and hot-path cache; a PostGIS `geom` column is maintained by a
 * trigger for spatial queries (docs/specs.md §6.1).
 */
@Entity('zones')
export class Zone {
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'jsonb' })
  boundary!: GeoJsonPolygon;

  @Index()
  @Column({ type: 'enum', enum: ZoneStatus, default: ZoneStatus.Active })
  status!: ZoneStatus;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ name: 'city_id', type: 'uuid', nullable: true })
  cityId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
