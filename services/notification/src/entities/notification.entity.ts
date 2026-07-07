import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { Channel } from './template.entity';

export enum NotificationStatus {
  Queued = 'queued',
  Sent = 'sent',
  Delivered = 'delivered',
  Failed = 'failed',
}

/** notif_db.notifications — delivery log for every dispatch attempt (docs/data-model.md · 10). */
@Entity('notifications')
export class NotificationRecord {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'enum', enum: Channel })
  channel!: Channel;

  @Column({ name: 'template_key' })
  templateKey!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Index()
  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.Queued })
  status!: NotificationStatus;

  @Column({ name: 'provider_ref', type: 'varchar', nullable: true })
  providerRef!: string | null;

  @CreateDateColumn({ name: 'sent_at', type: 'timestamptz' })
  sentAt!: Date;
}
