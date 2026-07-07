import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService, EventEnvelope, EventNames } from '@itms/events';
import { PaymentsService } from './payments.service';

/** Caches the payable amount for a ride when Fare publishes fare.calculated. */
@Injectable()
export class PaymentEventsConsumer implements OnModuleInit {
  constructor(
    private readonly bus: EventBusService,
    private readonly payments: PaymentsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe(['fare.calculated'], (env) => this.handle(env));
  }

  private async handle(env: EventEnvelope): Promise<void> {
    if (env.event_name !== EventNames.FareCalculated) return;
    const p = env.payload as { ride_id: string; total_paisa: number; fare_config_version: number };
    await this.payments.onFareCalculated(p.ride_id, p.total_paisa, p.fare_config_version);
  }
}
