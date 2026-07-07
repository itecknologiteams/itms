import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * reporting_db.processed_events — idempotency guard for projection updates.
 *
 * Refines docs/data-model.md's originally sketched `projection_offsets(last_event_id)`:
 * that shape fits a log-based broker with per-partition offsets (Kafka). On
 * RabbitMQ's at-least-once topic delivery there is no single ordered offset to
 * track — instead each event_id is recorded once per projection it touches, and
 * a redelivered event is a no-op. This is the correct idempotency mechanism for
 * *incremental* aggregates (a running sum can't be made idempotent by re-applying
 * the same delta twice, unlike a simple upsert).
 */
@Entity('processed_events')
export class ProcessedEvent {
  @PrimaryColumn('uuid', { name: 'event_id' })
  eventId!: string;

  @PrimaryColumn({ name: 'projection_name' })
  projectionName!: string;

  @CreateDateColumn({ name: 'processed_at', type: 'timestamptz' })
  processedAt!: Date;
}
