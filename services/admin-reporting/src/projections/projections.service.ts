import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { toDateKey } from '../domain/date-key';
import { hoursBetween, nextAverage } from '../domain/running-stats';
import { RidesDaily } from '../entities/rides-daily.entity';
import { DriverPerformance } from '../entities/driver-performance.entity';
import { ViolationSummary } from '../entities/violation-summary.entity';
import { PaymentMix } from '../entities/payment-mix.entity';
import { ProcessedEvent } from '../entities/processed-event.entity';

const NIL_ZONE = '00000000-0000-0000-0000-000000000000';

/**
 * Applies each domain event to the relevant CQRS read model exactly once
 * (docs/data-model.md · 11 reporting_db; docs/architecture.md §7.4). Every
 * mutation runs in a transaction alongside a `processed_events` insert — a
 * redelivered event fails that insert (primary key violation) and the whole
 * transaction rolls back, so aggregates are never double-counted.
 *
 * These are read models: rebuildable from the event log/DLQ replay tooling
 * (docs/devops.md §7) if ever reset.
 */
@Injectable()
export class ProjectionsService {
  private readonly logger = new Logger(ProjectionsService.name);
  // In-memory: ride-requested timestamps (for match-time) and driver online-since
  // (for online-hours). Documented v1 limitation — see README (single-replica).
  private readonly rideRequestedAt = new Map<string, number>();
  private readonly driverOnlineSince = new Map<string, number>();

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  markRideRequested(rideId: string, atMs: number): void {
    this.rideRequestedAt.set(rideId, atMs);
  }

  markDriverOnlineChanged(driverId: string, online: boolean, atMs: number): void {
    if (online) {
      this.driverOnlineSince.set(driverId, atMs);
      return;
    }
    const since = this.driverOnlineSince.get(driverId);
    if (since === undefined) return;
    this.driverOnlineSince.delete(driverId);
    void this.addOnlineHours(driverId, hoursBetween(since, atMs), atMs);
  }

  private async withDedup(
    eventId: string,
    projectionName: string,
    apply: (mgr: EntityManager) => Promise<void>,
  ): Promise<void> {
    try {
      await this.dataSource.transaction(async (mgr) => {
        await mgr.insert(ProcessedEvent, { eventId, projectionName });
        await apply(mgr);
      });
    } catch (err) {
      // Unique-violation on (event_id, projection_name) = already processed.
      if (this.isDuplicate(err)) {
        this.logger.debug(`Skipping already-processed event ${eventId} for ${projectionName}`);
        return;
      }
      throw err;
    }
  }

  private isDuplicate(err: unknown): boolean {
    return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
  }

  async onRideCompleted(
    eventId: string,
    payload: {
      ride_id: string;
      driver_id?: string;
      zone_id?: string;
      fare_paisa?: number;
      city_id?: string;
    },
    atMs: number,
  ): Promise<void> {
    const date = toDateKey(atMs);
    const zoneId = payload.zone_id ?? NIL_ZONE;
    const farePaisa = payload.fare_paisa ?? 0;
    const requestedAt = this.rideRequestedAt.get(payload.ride_id);
    const matchSeconds = requestedAt !== undefined ? (atMs - requestedAt) / 1000 : undefined;
    this.rideRequestedAt.delete(payload.ride_id);

    await this.withDedup(eventId, 'rides_daily', async (mgr) => {
      const row = await this.upsertRidesDaily(mgr, date, zoneId, payload.city_id ?? null);
      row.ridesCompleted += 1;
      row.revenuePaisa = String(BigInt(row.revenuePaisa) + BigInt(farePaisa));
      row.avgFarePaisa = nextAverage(row.avgFarePaisa, row.ridesCompleted - 1, farePaisa);
      if (matchSeconds !== undefined) {
        row.avgMatchSeconds = nextAverage(row.avgMatchSeconds, row.ridesCompleted - 1, matchSeconds);
      }
      await mgr.save(row);
    });

    if (payload.driver_id) {
      await this.withDedup(eventId, 'driver_performance', async (mgr) => {
        const row = await this.upsertDriverPerformance(mgr, payload.driver_id!, date);
        row.rides += 1;
        row.earningsPaisa = String(BigInt(row.earningsPaisa) + BigInt(farePaisa));
        await mgr.save(row);
      });
    }
  }

  async onRideCancelled(eventId: string, payload: { ride_id: string; zone_id?: string }, atMs: number): Promise<void> {
    this.rideRequestedAt.delete(payload.ride_id);
    await this.withDedup(eventId, 'rides_daily', async (mgr) => {
      const row = await this.upsertRidesDaily(mgr, toDateKey(atMs), payload.zone_id ?? NIL_ZONE, null);
      row.ridesCancelled += 1;
      await mgr.save(row);
    });
  }

  async onDispatchExhausted(eventId: string, payload: { ride_id: string; zone_id?: string }, atMs: number): Promise<void> {
    this.rideRequestedAt.delete(payload.ride_id);
    await this.withDedup(eventId, 'rides_daily', async (mgr) => {
      const row = await this.upsertRidesDaily(mgr, toDateKey(atMs), payload.zone_id ?? NIL_ZONE, null);
      row.noDriverCount += 1;
      await mgr.save(row);
    });
  }

  async onPaymentCompleted(
    eventId: string,
    payload: { method: string; amount_paisa: number },
    atMs: number,
  ): Promise<void> {
    await this.withDedup(eventId, 'payment_mix', async (mgr) => {
      const date = toDateKey(atMs);
      let row = await mgr.findOne(PaymentMix, { where: { date, method: payload.method } });
      if (!row) row = mgr.create(PaymentMix, { date, method: payload.method, count: 0, amountPaisa: '0' });
      row.count += 1;
      row.amountPaisa = String(BigInt(row.amountPaisa) + BigInt(payload.amount_paisa));
      await mgr.save(row);
    });
  }

  async onViolationDetected(eventId: string, payload: { zone_id: string }, atMs: number): Promise<void> {
    await this.withDedup(eventId, 'violation_summary', async (mgr) => {
      const row = await this.upsertViolationSummary(mgr, payload.zone_id, toDateKey(atMs));
      row.opened += 1;
      await mgr.save(row);
    });
  }

  async onViolationClosed(
    eventId: string,
    payload: { zone_id: string; opened_at?: string },
    atMs: number,
  ): Promise<void> {
    await this.withDedup(eventId, 'violation_summary', async (mgr) => {
      const row = await this.upsertViolationSummary(mgr, payload.zone_id, toDateKey(atMs));
      row.autoClosed += 1;
      if (payload.opened_at) {
        const durationS = (atMs - Date.parse(payload.opened_at)) / 1000;
        row.avgDurationS = nextAverage(row.avgDurationS, row.autoClosed - 1, durationS);
      }
      await mgr.save(row);
    });
  }

  async onViolationEscalated(eventId: string, payload: { zone_id: string }, atMs: number): Promise<void> {
    await this.withDedup(eventId, 'violation_summary', async (mgr) => {
      const row = await this.upsertViolationSummary(mgr, payload.zone_id, toDateKey(atMs));
      row.escalated += 1;
      await mgr.save(row);
    });
  }

  private async addOnlineHours(driverId: string, hours: number, atMs: number): Promise<void> {
    const date = toDateKey(atMs);
    await this.dataSource.transaction(async (mgr) => {
      const row = await this.upsertDriverPerformance(mgr, driverId, date);
      row.onlineHours += hours;
      await mgr.save(row);
    });
  }

  private async upsertRidesDaily(
    mgr: EntityManager,
    date: string,
    zoneId: string,
    cityId: string | null,
  ): Promise<RidesDaily> {
    let row = await mgr.findOne(RidesDaily, { where: { date, zoneId } });
    if (!row) {
      row = mgr.create(RidesDaily, {
        date,
        zoneId,
        cityId,
        ridesCompleted: 0,
        ridesCancelled: 0,
        noDriverCount: 0,
        revenuePaisa: '0',
        avgFarePaisa: 0,
        avgMatchSeconds: 0,
      });
    }
    return row;
  }

  private async upsertDriverPerformance(
    mgr: EntityManager,
    driverId: string,
    date: string,
  ): Promise<DriverPerformance> {
    let row = await mgr.findOne(DriverPerformance, { where: { driverId, date } });
    if (!row) {
      row = mgr.create(DriverPerformance, {
        driverId,
        date,
        rides: 0,
        onlineHours: 0,
        earningsPaisa: '0',
        ratingAvg: 0,
        violations: 0,
      });
    }
    return row;
  }

  private async upsertViolationSummary(
    mgr: EntityManager,
    zoneId: string,
    date: string,
  ): Promise<ViolationSummary> {
    let row = await mgr.findOne(ViolationSummary, { where: { zoneId, date } });
    if (!row) {
      row = mgr.create(ViolationSummary, {
        zoneId,
        date,
        opened: 0,
        autoClosed: 0,
        escalated: 0,
        avgDurationS: 0,
      });
    }
    return row;
  }
}
