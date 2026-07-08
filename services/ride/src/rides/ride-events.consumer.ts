import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService, EventEnvelope, EventNames } from '@itms/events';
import { PaymentMethod } from '../entities/ride.entity';
import { RideGateway } from './ride.gateway';
import { RideService } from './ride.service';

/**
 * Drives the ride saga from downstream events (docs/architecture.md §3.4):
 * dispatch exhaustion, fare calculation, payment outcomes, and relaying
 * dispatch offers to driver clients (no other service has a client-facing
 * gateway — see RideGateway.emitOffer's doc comment).
 */
@Injectable()
export class RideEventsConsumer implements OnModuleInit {
  constructor(
    private readonly bus: EventBusService,
    private readonly rides: RideService,
    private readonly gateway: RideGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe(
      [
        'dispatch.exhausted',
        'dispatch.offer.broadcast',
        'fare.calculated',
        'payment.completed',
        'payment.failed',
      ],
      (env) => this.handle(env),
    );
  }

  private async handle(env: EventEnvelope): Promise<void> {
    const p = env.payload as Record<string, unknown>;
    switch (env.event_name) {
      case EventNames.DispatchExhausted:
        return this.rides.onDispatchExhausted(String(p.ride_id));
      case EventNames.DispatchOfferBroadcast: {
        const rideId = String(p.ride_id);
        const pickup = await this.rides.getPickupForOffer(rideId);
        if (!pickup) return; // ride no longer exists / already resolved
        this.gateway.emitOffer(p.offered_driver_ids as string[], {
          ride_id: rideId,
          pickup,
          round: Number(p.round),
        });
        return;
      }
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
