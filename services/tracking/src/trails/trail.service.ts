import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { haversineMeters } from '@itms/common';
import { EventBusService, EventEnvelope, EventNames } from '@itms/events';
import { Between, Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { GpsLog } from '../entities/gps-log.entity';
import { TrailSlice } from '../entities/trail-slice.entity';

interface RideStartedPayload {
  ride_id: string;
  vehicle_id: string;
}
interface RideEndedPayload {
  ride_id: string;
}

/**
 * Binds the GPS trail travelled between ride start and end to the ride
 * (docs/specs.md §9), computing filtered distance for the Fare service. Distance
 * uses haversine over the trail with a simple speed-based outlier filter
 * (drop segments implying > 140 km/h), matching the fare spec (§7.1).
 */
@Injectable()
export class TrailService implements OnModuleInit {
  private readonly logger = new Logger(TrailService.name);
  private readonly openTrails = new Map<string, { vehicleId: string; startedAt: number }>();

  constructor(
    @InjectRepository(GpsLog) private readonly logs: Repository<GpsLog>,
    @InjectRepository(TrailSlice) private readonly slices: Repository<TrailSlice>,
    private readonly bus: EventBusService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe(
      ['ride.started', 'ride.ended', 'ride.completed'],
      (env) => this.handle(env),
    );
  }

  private async handle(env: EventEnvelope): Promise<void> {
    if (env.event_name === EventNames.RideStarted) {
      const p = env.payload as unknown as RideStartedPayload;
      if (p.ride_id && p.vehicle_id) {
        this.openTrails.set(p.ride_id, {
          vehicleId: p.vehicle_id,
          startedAt: Date.parse(env.occurred_at),
        });
      }
      return;
    }
    // ride.ended (preferred) or ride.completed as a fallback finalizer.
    const p = env.payload as unknown as RideEndedPayload;
    const open = p.ride_id ? this.openTrails.get(p.ride_id) : undefined;
    if (!open) return;
    await this.finalize(p.ride_id, open.vehicleId, open.startedAt, Date.parse(env.occurred_at));
    this.openTrails.delete(p.ride_id);
  }

  private async finalize(
    rideId: string,
    vehicleId: string,
    startedAt: number,
    endedAt: number,
  ): Promise<void> {
    const existing = await this.slices.findOne({ where: { rideId } });
    if (existing) return; // idempotent

    const points = await this.logs.find({
      where: { vehicleId, time: Between(new Date(startedAt), new Date(endedAt)) },
      order: { time: 'ASC' },
    });

    const distanceM = this.filteredDistance(points);
    await this.slices.save(
      this.slices.create({
        id: uuidv7(),
        rideId,
        vehicleId,
        fromTs: new Date(startedAt),
        toTs: new Date(endedAt),
        distanceM,
        pointCount: points.length,
      }),
    );
    this.logger.log(`Trail for ride ${rideId}: ${points.length} pts, ${Math.round(distanceM)} m`);
  }

  /** Sum segment distances, dropping segments that imply > 140 km/h (GPS outliers). */
  private filteredDistance(points: GpsLog[]): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const d = haversineMeters({ lat: a.lat, lon: a.lon }, { lat: b.lat, lon: b.lon });
      const dtHours = (b.time.getTime() - a.time.getTime()) / 3_600_000;
      const impliedKmh = dtHours > 0 ? d / 1000 / dtHours : 0;
      if (impliedKmh <= 140) total += d;
    }
    return total;
  }
}
