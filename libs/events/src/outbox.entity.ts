import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Transactional outbox row (docs/architecture.md §3.3).
 * Producers insert an outbox row IN THE SAME DB TRANSACTION as their state change;
 * the OutboxRelay later publishes it to RabbitMQ and stamps sent_at. This guarantees
 * "state changed but event lost" can never happen. Every service that publishes owns
 * a copy of this table.
 */
@Entity('outbox')
export class OutboxEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'event_name' })
  eventName!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Index()
  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date | null;
}
