import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * auth_db.devices — one row per app install. Drivers are limited to one active
 * device; a new device login deactivates the previous one (docs/specs.md D-01).
 */
@Entity('devices')
export class Device {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', nullable: true })
  platform!: string | null;

  @Column({ name: 'fcm_token', type: 'varchar', nullable: true })
  fcmToken!: string | null;

  @Column({ type: 'varchar', nullable: true })
  model!: string | null;

  @Column({ name: 'app_version', type: 'varchar', nullable: true })
  appVersion!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
