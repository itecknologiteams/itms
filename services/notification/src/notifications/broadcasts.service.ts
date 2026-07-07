import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Broadcast, BroadcastAudience } from '../entities/broadcast.entity';

/**
 * Records an admin broadcast announcement (docs/specs.md A-12). Fan-out to
 * every driver/passenger device is a bulk job against Auth's device registry —
 * out of scope for this pass (see README); this records the intent/audit trail.
 */
@Injectable()
export class BroadcastsService {
  constructor(@InjectRepository(Broadcast) private readonly broadcasts: Repository<Broadcast>) {}

  async create(audience: BroadcastAudience, templateKey: string, sentBy: string): Promise<Broadcast> {
    return this.broadcasts.save(
      this.broadcasts.create({ id: uuidv7(), audience, templateKey, sentBy, count: 0 }),
    );
  }

  list(): Promise<Broadcast[]> {
    return this.broadcasts.find({ order: { at: 'DESC' }, take: 100 });
  }
}
