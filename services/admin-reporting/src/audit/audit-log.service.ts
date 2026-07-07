import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { AdminAuditLog } from '../entities/admin-audit-log.entity';
import { WriteAuditLogDto } from './dto';

/**
 * Explicit audit-log write API (docs/security.md §6). Written by the acting
 * service at the moment of mutation rather than inferred from domain events —
 * not every admin action has a rich enough event payload to reconstruct
 * before/after state (see README for the integration pattern).
 */
@Injectable()
export class AuditLogService {
  constructor(@InjectRepository(AdminAuditLog) private readonly logs: Repository<AdminAuditLog>) {}

  record(dto: WriteAuditLogDto): Promise<AdminAuditLog> {
    return this.logs.save(
      this.logs.create({
        id: uuidv7(),
        adminId: dto.admin_id,
        action: dto.action,
        entity: dto.entity,
        entityId: dto.entity_id,
        before: dto.before ?? null,
        after: dto.after ?? null,
        ip: dto.ip ?? null,
      }),
    );
  }

  list(filter: { entity?: string; adminId?: string }) {
    const where: Record<string, unknown> = {};
    if (filter.entity) where.entity = filter.entity;
    if (filter.adminId) where.adminId = filter.adminId;
    return this.logs.find({ where, order: { at: 'DESC' }, take: 200 });
  }
}
