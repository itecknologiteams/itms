import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ConflictError, NotFoundError } from '@itms/common';
import { EventNames, OutboxEntity } from '@itms/events';
import { DataSource, Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Vehicle, VehicleStatus } from '../entities/vehicle.entity';
import { OnboardVehicleDto } from './dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
  ) {}

  async onboard(dto: OnboardVehicleDto): Promise<Vehicle> {
    const existing = await this.vehicles.findOne({ where: { plateNo: dto.plate_no } });
    if (existing) throw new ConflictError('VEHICLE_EXISTS', 'A vehicle with this plate already exists');

    return this.dataSource.transaction(async (mgr) => {
      const vehicle = mgr.create(Vehicle, {
        id: uuidv7(),
        plateNo: dto.plate_no,
        model: dto.model,
        year: dto.year ?? null,
        color: dto.color ?? null,
        trackerDeviceId: dto.tracker_device_id,
        status: VehicleStatus.Active,
        cityId: dto.city_id ?? null,
      });
      await mgr.save(vehicle);
      // Lets Tracking map the physical device id to this vehicle
      // (docs/architecture.md §2: Tracking's DeviceRegistry consumes this).
      await mgr.save(
        mgr.create(OutboxEntity, {
          id: uuidv7(),
          eventName: EventNames.VehicleUpdated,
          payload: {
            vehicle_id: vehicle.id,
            tracker_device_id: vehicle.trackerDeviceId,
            status: vehicle.status,
          },
          sentAt: null,
        }),
      );
      return vehicle;
    });
  }

  list(): Promise<Vehicle[]> {
    return this.vehicles.find({ order: { createdAt: 'DESC' } });
  }

  async get(id: string): Promise<Vehicle> {
    const v = await this.vehicles.findOne({ where: { id } });
    if (!v) throw new NotFoundError('VEHICLE_NOT_FOUND', 'Vehicle not found');
    return v;
  }

  async setStatus(id: string, status: VehicleStatus): Promise<Vehicle> {
    const vehicle = await this.get(id);
    return this.dataSource.transaction(async (mgr) => {
      vehicle.status = status;
      await mgr.save(vehicle);
      await mgr.save(
        mgr.create(OutboxEntity, {
          id: uuidv7(),
          eventName: EventNames.VehicleUpdated,
          payload: { vehicle_id: vehicle.id, status: vehicle.status },
          sentAt: null,
        }),
      );
      return vehicle;
    });
  }
}
