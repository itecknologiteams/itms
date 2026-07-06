import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService, EventEnvelope, EventNames } from '@itms/events';
import { PaymentMethod } from '../entities/ride.entity';
import { RideService } from './ride.service';

/**
 * Drives the ride saga from downstream events (docs/architecture.md §3.4):
 * dispatch exhaustion, fare calculation, and payment outcomes.
 */
@Injectable()
export class RideEventsConsumer implements OnModuleInit {
  constructor(
    private readonly bus: EventBusService,
    private readonly rides: RideService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe(
      ['dispatch.exhausted', 'fare.calculated', 'payment.completed', 'payment.failed'],
      (env) => this.handle(env),
    );
  }

  private async handle(env: EventEnvelope): Promise<void> {
    const p = env.payload as Record<string, unknown>;
    switch (env.event_name) {
      case EventNames.DispatchExhausted:
        return this.rides.onDispatchExhausted(String(p.ride_id));
      case EventNames.FareCalculated:
        return this.rides.onFareCalculated(
          String(p.ride_id),
          Number(p.total_paisa),
          Number(p.fare_config_version),
          p.distance_m === undefined ? undefined : Number(p.distance_m),
        );
      case EventNames.PaymentCompleted:
        return this.rides.onPaymentCompleted(String(p.ride_id), p.method as PaymentMethod);
      case EventNames.PaymentFailed:
        return this.rides.onPaymentFailed(String(p.ride_id));
      default:
        return;
    }
  }
}
