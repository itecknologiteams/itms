import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService, EventEnvelope, EventNames } from '@itms/events';
import { PassengersService } from './passengers.service';

/**
 * Maintains the ride-history projection and the unsettled-fare block
 * (docs/specs.md §8.2, data-model.md · 02 ride_history_proj).
 */
@Injectable()
export class PassengerEventsConsumer implements OnModuleInit {
  constructor(
    private readonly bus: EventBusService,
    private readonly passengers: PassengersService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe(
      ['ride.completed', 'ride.assigned', 'payment.failed'],
      (env) => this.handle(env),
    );
  }

  private async handle(env: EventEnvelope): Promise<void> {
    const p = env.payload as Record<string, unknown>;
    switch (env.event_name) {
      case EventNames.RideCompleted:
        await this.passengers.upsertHistoryFromRide({
          ride_id: String(p.ride_id),
          passenger_id: String(p.passenger_id),
          distance_m: p.distance_m as number | undefined,
          duration_s: p.duration_s as number | undefined,
          fare_paisa: p.fare_paisa !== undefined ? Number(p.fare_paisa) : undefined,
          payment_method: p.payment_method as string | undefined,
          status: 'completed',
          ended_at: env.occurred_at,
        });
        if (p.passenger_id) await this.passengers.setUnsettled(String(p.passenger_id), null);
        return;
      case EventNames.PaymentFailed:
        // ride_id is on the payment event; passenger resolution requires the ride
        // owner, which Ride's payload does not carry here. Left as a documented
        // follow-up: Payment/Ride should include passenger_id on payment.failed
        // so this consumer can flag the unsettled block without a sync lookup.
        return;
      default:
        return;
    }
  }
}
