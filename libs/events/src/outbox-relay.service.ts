import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { EventBusService, EVENTS_OPTIONS, EventsModuleOptions } from './event-bus.service';
import { createEnvelope } from './event-envelope';
import { OutboxEntity } from './outbox.entity';

/**
 * Polls the local outbox table and relays unsent rows to the event bus,
 * marking each sent on success (docs/architecture.md §3.3). At-least-once:
 * a crash between publish and mark-sent re-publishes, and consumers dedupe on
 * event_id — so this is safe.
 *
 * Injects the NestJS-managed TypeORM DataSource by type (the default connection
 * registered by TypeOrmModule.forRoot).
 */
@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly intervalMs = 1000;
  private readonly batchSize = 100;

  constructor(
    private readonly dataSource: DataSource,
    private readonly bus: EventBusService,
    @Inject(EVENTS_OPTIONS) private readonly opts: EventsModuleOptions,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    this.logger.log('Outbox relay started');
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.running) return; // no overlapping runs
    this.running = true;
    try {
      const repo = this.dataSource.getRepository(OutboxEntity);
      const pending = await repo.find({
        where: { sentAt: IsNull() },
        order: { createdAt: 'ASC' },
        take: this.batchSize,
      });
      for (const row of pending) {
        const envelope = createEnvelope({
          eventName: row.eventName,
          producer: this.opts.serviceName,
          payload: row.payload,
        });
        // Preserve the id chosen at write time for deterministic dedupe.
        envelope.event_id = row.id;
        await this.bus.publish(envelope);
        row.sentAt = new Date();
        await repo.save(row);
      }
      if (pending.length > 0) {
        this.logger.debug(`Relayed ${pending.length} outbox event(s)`);
      }
    } catch (err) {
      this.logger.error(`Outbox relay tick failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
