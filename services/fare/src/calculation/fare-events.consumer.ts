import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService, EventEnvelope, EventNames } from '@itms/events';
import { FareCalculationService } from './fare-calculation.service';

/** Triggers fare computation on ride.ended (docs/specs.md §7.3). */
@Injectable()
export class FareEventsConsumer implements OnModuleInit {
  constructor(
    private readonly bus: EventBusService,
    private readonly calc: FareCalculationService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe(['ride.ended'], (env) => this.handle(env));
  }

  private async handle(env: EventEnvelope): Promise<void> {
    if (env.event_name !== EventNames.RideEnded) return;
    await this.calc.onRideEnded(env.payload as never);
  }
}
