import { DynamicModule, Module } from '@nestjs/common';
import { EventBusService, EVENTS_OPTIONS, EventsModuleOptions } from './event-bus.service';
import { OutboxRelayService } from './outbox-relay.service';

/**
 * Wires the event bus (and optionally the outbox relay) into a service.
 *
 * Usage in a publisher service:
 *   EventsModule.forRoot({ url, exchange, serviceName, enableOutbox: true })
 *
 * When enableOutbox is true, the service must also register OutboxEntity in its
 * TypeORM data source (TypeOrmModule.forFeature([OutboxEntity])) and insert outbox
 * rows within the same transaction as its state changes. The relay injects the
 * NestJS-managed DataSource by type.
 */
@Module({})
export class EventsModule {
  static forRoot(options: EventsModuleOptions & { enableOutbox?: boolean }): DynamicModule {
    const providers = [
      { provide: EVENTS_OPTIONS, useValue: options },
      EventBusService,
    ];
    const exports: Array<typeof EventBusService | typeof OutboxRelayService> = [EventBusService];

    if (options.enableOutbox) {
      providers.push(OutboxRelayService as never);
      exports.push(OutboxRelayService);
    }

    return { module: EventsModule, global: true, providers, exports };
  }
}
