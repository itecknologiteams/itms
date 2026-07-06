import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ConflictError, NotFoundError } from '@itms/common';
import { EventNames, OutboxEntity } from '@itms/events';
import { DataSource, Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Violation, ViolationStatus } from '../entities/violation.entity';

@Injectable()
export class ViolationsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Violation) private readonly violations: Repository<Violation>,
  ) {}

  list(filter: { status?: ViolationStatus; zoneId?: string }): Promise<Violation[]> {
    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.zoneId) where.zoneId = filter.zoneId;
    return this.violations.find({ where, order: { openedAt: 'DESC' }, take: 200 });
  }

  async acknowledge(id: string, adminId: string): Promise<Violation> {
    const v = await this.require(id);
    if (v.status !== ViolationStatus.Open) {
      throw new ConflictError('NOT_OPEN', 'Only open violations can be acknowledged');
    }
    v.status = ViolationStatus.Acknowledged;
    v.ackBy = adminId;
    return this.violations.save(v);
  }

  async resolve(id: string, note: string): Promise<Violation> {
    const v = await this.require(id);
    if (v.status === ViolationStatus.Resolved) return v;
    v.status = ViolationStatus.Resolved;
    v.resolutionNote = note;
    v.closedAt = v.closedAt ?? new Date();
    return this.violations.save(v);
  }

  /** Escalate per policy (OPEN-5): emits an event Driver service consumes to suspend. */
  async escalate(id: string): Promise<Violation> {
    const v = await this.require(id);
    return this.dataSource.transaction(async (mgr) => {
      v.status = ViolationStatus.Escalated;
      await mgr.save(v);
      await mgr.save(
        mgr.create(OutboxEntity, {
          id: uuidv7(),
          eventName: EventNames.GeofenceViolationEscalated,
          payload: { violation_id: v.id, vehicle_id: v.vehicleId, zone_id: v.zoneId },
          sentAt: null,
        }),
      );
      return v;
    });
  }

  private async require(id: string): Promise<Violation> {
    const v = await this.violations.findOne({ where: { id } });
    if (!v) throw new NotFoundError('VIOLATION_NOT_FOUND', 'Violation not found');
    return v;
  }
}
