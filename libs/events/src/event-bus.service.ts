import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { EventEnvelope } from './event-envelope';

export const EVENTS_OPTIONS = Symbol('EVENTS_OPTIONS');

export interface EventsModuleOptions {
  url: string;
  exchange: string;
  /** Owning service name — used to name durable queues (`<service>.<eventName>`). */
  serviceName: string;
}

export type EventHandler = (envelope: EventEnvelope) => Promise<void>;

/**
 * Thin RabbitMQ client implementing the async communication contract in
 * docs/architecture.md §3.2:
 *  - topic exchange, routing key = event name
 *  - durable per-service queues, at-least-once delivery
 *  - DLQ after N failed attempts (dead-letter exchange)
 * Consumers MUST be idempotent (dedupe on event_id) — enforced by convention.
 *
 * The broker is abstracted behind this interface so it can be swapped for Kafka
 * later without touching call sites (docs/techstack.md §4 migration trigger).
 */
@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private connection?: amqp.ChannelModel;
  private channel?: amqp.Channel;
  private readonly maxRetries = 3;
  private readonly handlers: Array<{ patterns: string[]; handler: EventHandler }> = [];
  private consuming = false;

  constructor(@Inject(EVENTS_OPTIONS) private readonly opts: EventsModuleOptions) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  private async connect(): Promise<void> {
    const connection = await amqp.connect(this.opts.url);
    const channel = await connection.createChannel();
    await channel.assertExchange(this.opts.exchange, 'topic', { durable: true });
    await channel.assertExchange(this.dlx(), 'topic', { durable: true });
    await channel.prefetch(20);
    this.connection = connection;
    this.channel = channel;
    this.logger.log(`Connected to RabbitMQ exchange "${this.opts.exchange}"`);
  }

  private dlx(): string {
    return `${this.opts.exchange}.dlx`;
  }

  /** Publish an already-built envelope. Routing key = event_name. */
  async publish(envelope: EventEnvelope): Promise<void> {
    if (!this.channel) throw new Error('Event bus not connected');
    const ok = this.channel.publish(
      this.opts.exchange,
      envelope.event_name,
      Buffer.from(JSON.stringify(envelope)),
      { persistent: true, contentType: 'application/json', messageId: envelope.event_id },
    );
    if (!ok) await new Promise((r) => this.channel!.once('drain', r));
  }

  /**
   * Subscribe to one or more routing patterns. Handler failures are retried up to
   * maxRetries via requeue; after that the message is dead-lettered.
   *
   * Safe to call more than once per service (several components within one
   * service each owning a different slice of events is normal — see e.g.
   * Tracking's TrailService and DeviceRegistry). All calls share ONE queue
   * (`<service>.q`) and ONE underlying `channel.consume()`, dispatching each
   * message to whichever registered handler declared its routing key.
   * Calling `channel.consume()` again per subscribe() call would register a
   * second, *competing* consumer on the same queue — RabbitMQ round-robins
   * deliveries between competing consumers on one queue, so messages would
   * be silently misrouted to whichever handler happened to win delivery,
   * which then acks (drops) an event type it doesn't recognize instead of
   * the handler that actually needed it.
   */
  async subscribe(patterns: string[], handler: EventHandler): Promise<void> {
    if (!this.channel) throw new Error('Event bus not connected');
    const queue = `${this.opts.serviceName}.q`;
    await this.channel.assertQueue(queue, {
      durable: true,
      deadLetterExchange: this.dlx(),
    });
    for (const pattern of patterns) {
      await this.channel.bindQueue(queue, this.opts.exchange, pattern);
    }
    this.handlers.push({ patterns, handler });
    this.logger.log(`Queue "${queue}" handling [${patterns.join(', ')}]`);

    if (this.consuming) return;
    this.consuming = true;

    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;
      const routingKey = msg.fields.routingKey;
      const target = this.handlers.find((h) => h.patterns.includes(routingKey));
      if (!target) {
        this.logger.warn(
          `No handler registered for routing key "${routingKey}" — acking unhandled`,
        );
        this.channel!.ack(msg);
        return;
      }
      const attempts = ((msg.properties.headers?.['x-attempts'] as number) ?? 0) + 1;
      try {
        const envelope = JSON.parse(msg.content.toString()) as EventEnvelope;
        await target.handler(envelope);
        this.channel!.ack(msg);
      } catch (err) {
        this.logger.warn(
          `Handler failed (attempt ${attempts}/${this.maxRetries}) for ${routingKey}: ${
            (err as Error).message
          }`,
        );
        if (attempts >= this.maxRetries) {
          this.channel!.nack(msg, false, false); // to DLQ
        } else {
          // Ack now (removes it from this queue) and requeue after a delay.
          // Retries exist for transient cross-service races (e.g. Fare
          // reading Tracking's trail right after `ride.ended`, before
          // Tracking's own independent consumption of the same event has
          // finished writing it) — an immediate republish (the previous
          // behavior) reruns all 3 attempts within milliseconds of each
          // other, giving the race no real time to resolve and sending it
          // to the DLQ permanently instead of self-healing.
          this.channel!.ack(msg);
          const delayMs = attempts * 500;
          setTimeout(() => {
            this.channel?.publish(this.opts.exchange, routingKey, msg.content, {
              ...msg.properties,
              headers: { ...msg.properties.headers, 'x-attempts': attempts },
            });
          }, delayMs);
        }
      }
    });
  }
}
