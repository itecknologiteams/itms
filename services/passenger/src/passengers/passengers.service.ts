import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConflictError, DomainRuleError, NotFoundError } from '@itms/common';
import { Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { PASSENGER_CONFIG, PassengerConfig } from '../config/configuration';
import { Passenger, PassengerStatus } from '../entities/passenger.entity';
import { SavedMethod } from '../entities/saved-method.entity';
import { RideHistoryProjection } from '../entities/ride-history-proj.entity';
import { canBookRide } from '../domain/booking-eligibility';
import { AddSavedMethodDto, CompleteProfileDto, UpdateProfileDto } from './dto';

@Injectable()
export class PassengersService {
  constructor(
    @Inject(PASSENGER_CONFIG) private readonly config: PassengerConfig,
    @InjectRepository(Passenger) private readonly passengers: Repository<Passenger>,
    @InjectRepository(SavedMethod) private readonly savedMethods: Repository<SavedMethod>,
    @InjectRepository(RideHistoryProjection)
    private readonly history: Repository<RideHistoryProjection>,
  ) {}

  /** Completes the profile after first OTP login (docs/specs.md P-02). Idempotent. */
  async completeProfile(authUserId: string, phone: string, dto: CompleteProfileDto): Promise<Passenger> {
    const existing = await this.passengers.findOne({ where: { authUserId } });
    if (existing) return existing;
    return this.passengers.save(
      this.passengers.create({
        id: uuidv7(),
        authUserId,
        name: dto.name,
        phone,
        email: dto.email ?? null,
        language: dto.language ?? undefined,
        status: PassengerStatus.Active,
        unsettledRideId: null,
        ratingAvg: '0',
      }),
    );
  }

  async getByAuthUserId(authUserId: string): Promise<Passenger> {
    const p = await this.passengers.findOne({ where: { authUserId } });
    if (!p) throw new NotFoundError('PASSENGER_NOT_FOUND', 'Complete your profile first');
    return p;
  }

  async get(id: string): Promise<Passenger> {
    const p = await this.passengers.findOne({ where: { id } });
    if (!p) throw new NotFoundError('PASSENGER_NOT_FOUND', 'Passenger not found');
    return p;
  }

  async updateProfile(passengerId: string, dto: UpdateProfileDto): Promise<Passenger> {
    const p = await this.get(passengerId);
    if (dto.name !== undefined) p.name = dto.name;
    if (dto.email !== undefined) p.email = dto.email;
    if (dto.language !== undefined) p.language = dto.language;
    return this.passengers.save(p);
  }

  /** Enforced before ride creation by the Ride service via a sync check in a
   * fuller integration; exposed here as the source of truth for the rule. */
  async assertCanBook(passengerId: string): Promise<void> {
    const p = await this.get(passengerId);
    const decision = canBookRide({ status: p.status, unsettledRideId: p.unsettledRideId });
    if (!decision.allowed) {
      throw new DomainRuleError(decision.reason ?? 'NOT_ELIGIBLE', 'Cannot book a ride right now');
    }
  }

  async listSavedMethods(passengerId: string): Promise<SavedMethod[]> {
    return this.savedMethods.find({ where: { passengerId }, order: { createdAt: 'DESC' } });
  }

  async addSavedMethod(passengerId: string, dto: AddSavedMethodDto): Promise<SavedMethod> {
    const count = await this.savedMethods.count({ where: { passengerId } });
    if (count >= this.config.maxSavedMethods) {
      throw new ConflictError('TOO_MANY_METHODS', 'Saved payment method limit reached');
    }
    const isDefault = count === 0;
    return this.savedMethods.save(
      this.savedMethods.create({
        id: uuidv7(),
        passengerId,
        type: dto.type,
        gatewayToken: dto.gateway_token,
        label: dto.label ?? null,
        isDefault,
      }),
    );
  }

  async removeSavedMethod(passengerId: string, methodId: string): Promise<void> {
    const method = await this.savedMethods.findOne({ where: { id: methodId, passengerId } });
    if (!method) throw new NotFoundError('METHOD_NOT_FOUND', 'Saved method not found');
    await this.savedMethods.remove(method);
  }

  async rideHistory(passengerId: string): Promise<RideHistoryProjection[]> {
    return this.history.find({ where: { passengerId }, order: { startedAt: 'DESC' }, take: 100 });
  }

  async blockUnblock(passengerId: string, status: PassengerStatus): Promise<Passenger> {
    const p = await this.get(passengerId);
    p.status = status;
    return this.passengers.save(p);
  }

  // ── Projection maintenance (event-driven) ──────────────────────────────

  async upsertHistoryFromRide(payload: {
    ride_id: string;
    passenger_id: string;
    driver_id?: string | null;
    distance_m?: number | null;
    duration_s?: number | null;
    fare_paisa?: number | null;
    payment_method?: string | null;
    status: string;
    ended_at?: string;
  }): Promise<void> {
    let row = await this.history.findOne({ where: { rideId: payload.ride_id } });
    if (!row) {
      row = this.history.create({ rideId: payload.ride_id, passengerId: payload.passenger_id });
    }
    row.distanceM = payload.distance_m ?? row.distanceM ?? null;
    row.durationS = payload.duration_s ?? row.durationS ?? null;
    row.farePaisa = payload.fare_paisa !== undefined ? String(payload.fare_paisa) : row.farePaisa;
    row.paymentMethod = payload.payment_method ?? row.paymentMethod ?? null;
    row.status = payload.status;
    row.endedAt = payload.ended_at ? new Date(payload.ended_at) : row.endedAt;
    await this.history.save(row);
  }

  /** Sets/clears the unsettled-fare block based on ride payment outcome (docs/specs.md §8.2). */
  async setUnsettled(passengerId: string, rideId: string | null): Promise<void> {
    await this.passengers.update({ id: passengerId }, { unsettledRideId: rideId });
  }
}
