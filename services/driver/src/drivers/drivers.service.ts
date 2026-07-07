import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ConflictError, DomainRuleError, NotFoundError } from '@itms/common';
import { EventNames, OutboxEntity } from '@itms/events';
import { DataSource, IsNull, Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Driver, DriverStatus, OnlineStatus } from '../entities/driver.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { DriverVehicleAssignment } from '../entities/driver-vehicle-assignment.entity';
import { DriverDocument, DocumentReviewStatus, DocumentType } from '../entities/driver-document.entity';
import { Suspension, SuspensionSource } from '../entities/suspension.entity';
import { canGoOnline } from '../domain/eligibility';
import { AuthClient } from '../auth/auth.client';
import { OnboardDriverDto } from './dto';

@Injectable()
export class DriversService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Driver) private readonly drivers: Repository<Driver>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(DriverVehicleAssignment)
    private readonly assignments: Repository<DriverVehicleAssignment>,
    @InjectRepository(DriverDocument) private readonly documents: Repository<DriverDocument>,
    @InjectRepository(Suspension) private readonly suspensions: Repository<Suspension>,
    private readonly authClient: AuthClient,
  ) {}

  async onboard(dto: OnboardDriverDto): Promise<Driver> {
    const existing = await this.drivers.findOne({ where: { phone: dto.phone } });
    if (existing) throw new ConflictError('DRIVER_EXISTS', 'A driver with this phone already exists');

    const { user_id } = await this.authClient.provisionDriver(dto.phone);
    return this.drivers.save(
      this.drivers.create({
        id: uuidv7(),
        authUserId: user_id,
        name: dto.name,
        phone: dto.phone,
        cnic: dto.cnic ?? null,
        licenseNo: dto.license_no ?? null,
        licenseExpiry: dto.license_expiry ?? null,
        photoDocId: null,
        status: DriverStatus.Pending,
        online: OnlineStatus.Offline,
        currentVehicleId: null,
        ratingAvg: '0',
      }),
    );
  }

  list(status?: DriverStatus): Promise<Driver[]> {
    return this.drivers.find({ where: status ? { status } : {}, order: { createdAt: 'DESC' } });
  }

  async get(id: string): Promise<Driver> {
    const d = await this.drivers.findOne({ where: { id } });
    if (!d) throw new NotFoundError('DRIVER_NOT_FOUND', 'Driver not found');
    return d;
  }

  async getByAuthUserId(authUserId: string): Promise<Driver> {
    const d = await this.drivers.findOne({ where: { authUserId } });
    if (!d) throw new NotFoundError('DRIVER_NOT_FOUND', 'Driver not found');
    return d;
  }

  /** Admin approves a driver after document review (docs/specs.md A-04). */
  async approve(id: string): Promise<Driver> {
    const d = await this.get(id);
    d.status = DriverStatus.Approved;
    return this.drivers.save(d);
  }

  async reject(id: string): Promise<Driver> {
    const d = await this.get(id);
    d.status = DriverStatus.Pending; // stays pending for re-submission; documents carry rejection
    return this.drivers.save(d);
  }

  /** Assign a vehicle to a driver, closing any prior open assignment for either side. */
  async assignVehicle(driverId: string, vehicleId: string): Promise<Driver> {
    const driver = await this.get(driverId);
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundError('VEHICLE_NOT_FOUND', 'Vehicle not found');

    await this.dataSource.transaction(async (mgr) => {
      await mgr.update(
        DriverVehicleAssignment,
        { driverId, toTs: IsNull() },
        { toTs: new Date() },
      );
      await mgr.update(
        DriverVehicleAssignment,
        { vehicleId, toTs: IsNull() },
        { toTs: new Date() },
      );
      await mgr.save(
        mgr.create(DriverVehicleAssignment, {
          id: uuidv7(),
          driverId,
          vehicleId,
          fromTs: new Date(),
          toTs: null,
        }),
      );
      driver.currentVehicleId = vehicleId;
      await mgr.save(driver);
    });
    return driver;
  }

  /** Driver toggles online/offline (docs/specs.md D-02), gated by eligibility rules. */
  async setOnline(driverId: string, online: boolean): Promise<Driver> {
    const driver = await this.get(driverId);
    if (!online) {
      if (driver.online === OnlineStatus.OnTrip) {
        throw new ConflictError('ON_TRIP', 'Cannot go offline while on a trip');
      }
      driver.online = OnlineStatus.Offline;
      await this.drivers.save(driver);
      await this.publishStatus(driver);
      return driver;
    }

    const isSuspended = await this.hasOpenSuspension(driverId);
    const decision = canGoOnline({
      driverStatus: driver.status,
      hasVehicle: !!driver.currentVehicleId,
      isSuspended,
      licenseExpiry: driver.licenseExpiry ? new Date(driver.licenseExpiry) : null,
      now: Date.now(),
    });
    if (!decision.eligible) {
      throw new DomainRuleError(decision.reason ?? 'NOT_ELIGIBLE', 'Not eligible to go online');
    }

    driver.online = OnlineStatus.Online;
    await this.drivers.save(driver);
    await this.publishStatus(driver);
    return driver;
  }

  /** Called by the Ride/Dispatch flow indirectly via events in a full deployment;
   * exposed here for completeness of the on-trip toggle in this service's own API. */
  async setOnTrip(driverId: string, onTrip: boolean): Promise<void> {
    const driver = await this.get(driverId);
    driver.online = onTrip ? OnlineStatus.OnTrip : OnlineStatus.Online;
    await this.drivers.save(driver);
    await this.publishStatus(driver);
  }

  async suspend(driverId: string, reason: string, adminId: string): Promise<Driver> {
    const driver = await this.get(driverId);
    await this.dataSource.transaction(async (mgr) => {
      await mgr.save(
        mgr.create(Suspension, {
          id: uuidv7(),
          driverId,
          reason,
          source: SuspensionSource.Admin,
          fromTs: new Date(),
          toTs: null,
          liftedBy: null,
        }),
      );
      driver.status = DriverStatus.Suspended;
      driver.online = OnlineStatus.Offline;
      await mgr.save(driver);
      await mgr.save(
        mgr.create(OutboxEntity, {
          id: uuidv7(),
          eventName: EventNames.DriverSuspended,
          payload: { driver_id: driverId, reason, suspended_by: adminId },
          sentAt: null,
        }),
      );
    });
    return driver;
  }

  async liftSuspension(driverId: string, adminId: string): Promise<Driver> {
    const driver = await this.get(driverId);
    await this.suspensions.update(
      { driverId, toTs: IsNull() },
      { toTs: new Date(), liftedBy: adminId },
    );
    driver.status = DriverStatus.Approved;
    return this.drivers.save(driver);
  }

  async uploadDocumentRecord(
    driverId: string,
    type: DocumentType,
    mediaId: string,
    expiryDate?: string,
  ): Promise<DriverDocument> {
    return this.documents.save(
      this.documents.create({
        id: uuidv7(),
        driverId,
        type,
        mediaId,
        status: DocumentReviewStatus.Pending,
        reviewedBy: null,
        expiryDate: expiryDate ?? null,
      }),
    );
  }

  async reviewDocument(
    documentId: string,
    status: DocumentReviewStatus,
    reviewerId: string,
  ): Promise<DriverDocument> {
    const doc = await this.documents.findOne({ where: { id: documentId } });
    if (!doc) throw new NotFoundError('DOCUMENT_NOT_FOUND', 'Document not found');
    doc.status = status;
    doc.reviewedBy = reviewerId;
    return this.documents.save(doc);
  }

  listDocuments(driverId: string): Promise<DriverDocument[]> {
    return this.documents.find({ where: { driverId }, order: { createdAt: 'DESC' } });
  }

  /** Escalation consumer target: forcibly suspend on a geofence violation escalation. */
  async suspendFromViolation(vehicleId: string, reason: string): Promise<void> {
    const assignment = await this.assignments.findOne({ where: { vehicleId, toTs: IsNull() } });
    if (!assignment) return; // no driver currently bound to this vehicle
    const driver = await this.drivers.findOne({ where: { id: assignment.driverId } });
    if (!driver || driver.status === DriverStatus.Suspended) return;

    await this.dataSource.transaction(async (mgr) => {
      await mgr.save(
        mgr.create(Suspension, {
          id: uuidv7(),
          driverId: driver.id,
          reason,
          source: SuspensionSource.ViolationPolicy,
          fromTs: new Date(),
          toTs: null,
          liftedBy: null,
        }),
      );
      driver.status = DriverStatus.Suspended;
      driver.online = OnlineStatus.Offline;
      await mgr.save(driver);
      await mgr.save(
        mgr.create(OutboxEntity, {
          id: uuidv7(),
          eventName: EventNames.DriverSuspended,
          payload: { driver_id: driver.id, reason, suspended_by: 'system:violation_policy' },
          sentAt: null,
        }),
      );
    });
  }

  private async hasOpenSuspension(driverId: string): Promise<boolean> {
    const count = await this.suspensions.count({ where: { driverId, toTs: IsNull() } });
    return count > 0;
  }

  private async publishStatus(driver: Driver): Promise<void> {
    await this.dataSource
      .getRepository(OutboxEntity)
      .save(
        this.dataSource.getRepository(OutboxEntity).create({
          id: uuidv7(),
          eventName: EventNames.DriverStatusChanged,
          payload: {
            driver_id: driver.id,
            vehicle_id: driver.currentVehicleId,
            online: driver.online === OnlineStatus.Online,
          },
          sentAt: null,
        }),
      );
  }
}
