import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  ConflictError,
  DomainRuleError,
  ForbiddenError,
  haversineMeters,
  NotFoundError,
} from '@itms/common';
import { EventNames, OutboxEntity } from '@itms/events';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { RIDE_CONFIG, RideConfig } from '../config/configuration';
import { PaymentMethod, Ride } from '../entities/ride.entity';
import { RideTransition, TransitionActor } from '../entities/ride-transition.entity';
import { Rating } from '../entities/rating.entity';
import { SosEvent } from '../entities/sos-event.entity';
import { isTerminal, RideAction, RideStatus, transition } from '../domain/ride-state-machine';
import { CreateRideDto, PointDto, RatingDto } from './dto';
import { DispatchClient } from '../dispatch/dispatch.client';
import { RideGateway } from './ride.gateway';

interface PersistOpts {
  action: RideAction;
  actor: TransitionActor;
  actorId?: string | null;
  mutate?: (ride: Ride) => void;
  events?: Array<{ name: string; payload: Record<string, unknown> }>;
  meta?: Record<string, unknown>;
  /** Skip the state-machine transition (caller sets status directly in mutate). */
  skipTransition?: boolean;
}

@Injectable()
export class RideService {
  private readonly logger = new Logger(RideService.name);

  constructor(
    @Inject(RIDE_CONFIG) private readonly config: RideConfig,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Ride) private readonly rides: Repository<Ride>,
    @InjectRepository(Rating) private readonly ratings: Repository<Rating>,
    @InjectRepository(SosEvent) private readonly sos: Repository<SosEvent>,
    private readonly dispatch: DispatchClient,
    private readonly gateway: RideGateway,
  ) {}

  // ── Passenger actions ────────────────────────────────────────────────────

  async requestRide(passengerId: string, dto: CreateRideDto): Promise<Ride> {
    await this.assertNoActiveRide(passengerId);
    const now = new Date();
    const ride = await this.dataSource.transaction(async (mgr) => {
      const r = mgr.create(Ride, {
        id: uuidv7(),
        passengerId,
        driverId: null,
        vehicleId: null,
        status: RideStatus.Matching, // requested → matching immediately
        pickupPoint: { lat: dto.pickup.lat, lon: dto.pickup.lon },
        pickupZoneId: null,
        dropoffPoint: dto.dropoff ? { lat: dto.dropoff.lat, lon: dto.dropoff.lon } : null,
        requestedAt: now,
        rematchCount: 0,
      });
      await mgr.save(r);
      await this.recordTransition(mgr, r.id, null, RideStatus.Requested, TransitionActor.Passenger, passengerId);
      await this.recordTransition(mgr, r.id, RideStatus.Requested, RideStatus.Matching, TransitionActor.System, null);
      await this.emit(mgr, EventNames.RideRequested, {
        ride_id: r.id,
        passenger_id: passengerId,
        pickup: r.pickupPoint,
        pickup_zone_id: r.pickupZoneId,
      });
      return r;
    });
    this.gateway.emitRideState(ride);
    return ride;
  }

  async cancelByPassenger(rideId: string, passengerId: string, reason: string): Promise<Ride> {
    const ride = await this.requireOwned(rideId, passengerId);
    return this.apply(ride, {
      action: RideAction.PassengerCancel,
      actor: TransitionActor.Passenger,
      actorId: passengerId,
      mutate: (r) => (r.cancelReason = reason),
      events: [
        { name: EventNames.RideCancelled, payload: { ride_id: ride.id, actor: 'passenger', reason } },
      ],
    });
  }

  async rate(rideId: string, passengerId: string, dto: RatingDto): Promise<Rating> {
    const ride = await this.requireOwned(rideId, passengerId);
    if (ride.status !== RideStatus.Completed) {
      throw new DomainRuleError('RIDE_NOT_COMPLETED', 'Can only rate a completed ride');
    }
    if (!ride.driverId) throw new DomainRuleError('NO_DRIVER', 'Ride had no driver');
    const existing = await this.ratings.findOne({ where: { rideId } });
    if (existing) throw new ConflictError('ALREADY_RATED', 'Ride already rated');
    return this.ratings.save(
      this.ratings.create({
        id: uuidv7(),
        rideId,
        passengerId,
        driverId: ride.driverId,
        stars: dto.stars,
        comment: dto.comment ?? null,
      }),
    );
  }

  async raiseSos(rideId: string, raisedBy: string, pos: PointDto): Promise<SosEvent> {
    const ride = await this.rides.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundError('RIDE_NOT_FOUND', 'Ride not found');
    if (ride.passengerId !== raisedBy && ride.driverId !== raisedBy) {
      throw new ForbiddenError('NOT_ON_RIDE', 'Not a participant of this ride');
    }
    const event = await this.sos.save(
      this.sos.create({ id: uuidv7(), rideId, raisedBy, lat: pos.lat, lon: pos.lon }),
    );
    this.gateway.emitSos(ride, pos);
    this.logger.warn(`SOS raised on ride ${rideId} by ${raisedBy}`);
    return event;
  }

  // ── Driver actions ───────────────────────────────────────────────────────

  /** Driver taps Accept → atomic claim in Dispatch; on win, assign. */
  async accept(rideId: string, driverId: string): Promise<Ride> {
    const ride = await this.require(rideId);
    if (ride.status !== RideStatus.Matching) {
      throw new ConflictError('NOT_MATCHING', 'Ride is no longer accepting drivers');
    }
    const claim = await this.dispatch.claim(rideId, driverId);
    if (!claim.won) {
      throw new ConflictError('OFFER_LOST', 'Another driver took this ride');
    }
    return this.apply(ride, {
      action: RideAction.Assign,
      actor: TransitionActor.Driver,
      actorId: driverId,
      mutate: (r) => {
        r.driverId = driverId;
        r.vehicleId = claim.vehicleId ?? null;
        r.assignedAt = new Date();
      },
      events: [
        {
          name: EventNames.RideAssigned,
          payload: { ride_id: rideId, driver_id: driverId, vehicle_id: claim.vehicleId },
        },
      ],
    });
  }

  async arrived(rideId: string, driverId: string): Promise<Ride> {
    const ride = await this.requireDriver(rideId, driverId);
    return this.apply(ride, {
      action: RideAction.Arrive,
      actor: TransitionActor.Driver,
      actorId: driverId,
      mutate: (r) => (r.arrivedAt = new Date()),
    });
  }

  async start(rideId: string, driverId: string, pos: PointDto): Promise<Ride> {
    const ride = await this.requireDriver(rideId, driverId);
    const dist = haversineMeters(ride.pickupPoint, { lat: pos.lat, lon: pos.lon });
    if (dist > this.config.startProximityMeters) {
      throw new DomainRuleError('TOO_FAR_FROM_PICKUP', 'Driver is not at the pickup point', {
        distance_m: Math.round(dist),
        allowed_m: this.config.startProximityMeters,
      });
    }
    return this.apply(ride, {
      action: RideAction.Start,
      actor: TransitionActor.Driver,
      actorId: driverId,
      mutate: (r) => (r.startedAt = new Date()),
      events: [
        { name: EventNames.RideStarted, payload: { ride_id: rideId, vehicle_id: ride.vehicleId } },
      ],
    });
  }

  async end(rideId: string, driverId: string): Promise<Ride> {
    const ride = await this.requireDriver(rideId, driverId);
    const endedAt = new Date();
    const durationS = ride.startedAt
      ? Math.round((endedAt.getTime() - ride.startedAt.getTime()) / 1000)
      : 0;
    return this.apply(ride, {
      action: RideAction.End,
      actor: TransitionActor.Driver,
      actorId: driverId,
      mutate: (r) => {
        r.endedAt = endedAt;
        r.durationS = durationS;
      },
      events: [
        {
          name: EventNames.RideEnded,
          payload: {
            ride_id: rideId,
            vehicle_id: ride.vehicleId,
            started_at: ride.startedAt?.toISOString(),
            ended_at: endedAt.toISOString(),
            duration_s: durationS,
            pickup_zone_id: ride.pickupZoneId,
          },
        },
      ],
    });
  }

  async noShow(rideId: string, driverId: string, pos: PointDto): Promise<Ride> {
    const ride = await this.requireDriver(rideId, driverId);
    if (!ride.arrivedAt) throw new DomainRuleError('NOT_ARRIVED', 'Mark arrived first');
    const waitedMin = (Date.now() - ride.arrivedAt.getTime()) / 60_000;
    if (waitedMin < this.config.noShowMinutes) {
      throw new DomainRuleError('TOO_SOON', `Wait at least ${this.config.noShowMinutes} min`);
    }
    const dist = haversineMeters(ride.pickupPoint, { lat: pos.lat, lon: pos.lon });
    if (dist > this.config.startProximityMeters) {
      throw new DomainRuleError('NOT_AT_PICKUP', 'Must be at pickup to report a no-show');
    }
    return this.apply(ride, {
      action: RideAction.NoShow,
      actor: TransitionActor.Driver,
      actorId: driverId,
      mutate: (r) => (r.cancelReason = 'passenger_no_show'),
      events: [
        { name: EventNames.RideCancelled, payload: { ride_id: rideId, actor: 'system', reason: 'no_show' } },
      ],
    });
  }

  async driverCancel(rideId: string, driverId: string, reason: string): Promise<Ride> {
    const ride = await this.requireDriver(rideId, driverId);
    // Re-match up to the configured cap, else terminate as driver-cancelled.
    if (ride.rematchCount >= this.config.maxAutoRematch) {
      return this.apply(ride, {
        action: RideAction.PassengerCancel, // reuse terminal path
        actor: TransitionActor.Driver,
        actorId: driverId,
        mutate: (r) => {
          r.status = RideStatus.CancelledByDriver;
          r.cancelReason = reason;
        },
        skipTransition: true,
        events: [
          { name: EventNames.RideCancelled, payload: { ride_id: rideId, actor: 'driver', reason } },
        ],
      });
    }
    return this.apply(ride, {
      action: RideAction.DriverCancel,
      actor: TransitionActor.Driver,
      actorId: driverId,
      mutate: (r) => {
        r.driverId = null;
        r.vehicleId = null;
        r.assignedAt = null;
        r.arrivedAt = null;
        r.rematchCount += 1;
      },
      events: [
        {
          name: EventNames.RideRequested,
          payload: { ride_id: rideId, passenger_id: ride.passengerId, pickup: ride.pickupPoint, pickup_zone_id: ride.pickupZoneId },
        },
      ],
    });
  }

  // ── Saga: consume downstream events ──────────────────────────────────────

  async onDispatchExhausted(rideId: string): Promise<void> {
    const ride = await this.rides.findOne({ where: { id: rideId } });
    if (!ride || ride.status !== RideStatus.Matching) return;
    await this.apply(ride, {
      action: RideAction.Exhausted,
      actor: TransitionActor.System,
      events: [
        { name: EventNames.RideCancelled, payload: { ride_id: rideId, actor: 'system', reason: 'no_driver_found' } },
      ],
    });
  }

  async onFareCalculated(rideId: string, farePaisa: number, version: number, distanceM?: number): Promise<void> {
    const ride = await this.rides.findOne({ where: { id: rideId } });
    if (!ride) return;
    ride.farePaisa = String(farePaisa);
    ride.fareConfigVersion = version;
    if (distanceM !== undefined) ride.distanceM = distanceM;
    await this.rides.save(ride);
    this.gateway.emitFare(ride);
  }

  async onPaymentCompleted(rideId: string, method: PaymentMethod): Promise<void> {
    const ride = await this.rides.findOne({ where: { id: rideId } });
    if (!ride || ride.status === RideStatus.Completed) return;
    await this.apply(ride, {
      action: RideAction.PaymentSuccess,
      actor: TransitionActor.System,
      mutate: (r) => (r.paymentMethod = method),
      events: [
        {
          name: EventNames.RideCompleted,
          payload: {
            ride_id: ride.id,
            passenger_id: ride.passengerId,
            driver_id: ride.driverId,
            distance_m: ride.distanceM,
            duration_s: ride.durationS,
            fare_paisa: ride.farePaisa,
            payment_method: method,
          },
        },
      ],
    });
  }

  async onPaymentFailed(rideId: string): Promise<void> {
    const ride = await this.rides.findOne({ where: { id: rideId } });
    if (!ride || ride.status !== RideStatus.PendingPayment) return;
    await this.apply(ride, { action: RideAction.PaymentFailed, actor: TransitionActor.System });
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  async getForActor(rideId: string, userId: string): Promise<Ride> {
    const ride = await this.require(rideId);
    if (ride.passengerId !== userId && ride.driverId !== userId) {
      throw new ForbiddenError('NOT_ON_RIDE', 'Not a participant of this ride');
    }
    return ride;
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private async apply(ride: Ride, opts: PersistOpts): Promise<Ride> {
    const from = ride.status;
    const to = opts.skipTransition ? ride.status : transition(from, opts.action);
    const updated = await this.dataSource.transaction(async (mgr) => {
      if (!opts.skipTransition) ride.status = to;
      opts.mutate?.(ride);
      await mgr.save(ride);
      await this.recordTransition(mgr, ride.id, from, ride.status, opts.actor, opts.actorId ?? null, opts.meta);
      for (const e of opts.events ?? []) await this.emit(mgr, e.name, e.payload);
      return ride;
    });
    this.gateway.emitRideState(updated);
    return updated;
  }

  private async recordTransition(
    mgr: EntityManager,
    rideId: string,
    from: RideStatus | null,
    to: RideStatus,
    actor: TransitionActor,
    actorId: string | null,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    await mgr.save(
      mgr.create(RideTransition, {
        id: uuidv7(),
        rideId,
        fromStatus: from,
        toStatus: to,
        actor,
        actorId,
        meta: meta ?? null,
      }),
    );
  }

  private async emit(mgr: EntityManager, eventName: string, payload: Record<string, unknown>): Promise<void> {
    await mgr.save(mgr.create(OutboxEntity, { id: uuidv7(), eventName, payload, sentAt: null }));
  }

  private async require(rideId: string): Promise<Ride> {
    const ride = await this.rides.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundError('RIDE_NOT_FOUND', 'Ride not found');
    return ride;
  }

  private async requireOwned(rideId: string, passengerId: string): Promise<Ride> {
    const ride = await this.require(rideId);
    if (ride.passengerId !== passengerId) {
      throw new ForbiddenError('NOT_YOUR_RIDE', 'Not your ride');
    }
    return ride;
  }

  private async requireDriver(rideId: string, driverId: string): Promise<Ride> {
    const ride = await this.require(rideId);
    if (ride.driverId !== driverId) {
      throw new ForbiddenError('NOT_YOUR_RIDE', 'Not assigned to you');
    }
    return ride;
  }

  private async assertNoActiveRide(passengerId: string): Promise<void> {
    const active = await this.rides.findOne({
      where: { passengerId },
      order: { createdAt: 'DESC' },
    });
    if (active && !isTerminal(active.status)) {
      throw new ConflictError('ACTIVE_RIDE_EXISTS', 'Finish your current ride first');
    }
  }
}
