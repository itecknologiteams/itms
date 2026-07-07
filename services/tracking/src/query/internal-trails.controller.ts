import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Public } from '@itms/auth';
import { Repository } from 'typeorm';
import { TrailSlice } from '../entities/trail-slice.entity';

/** Internal trail-distance lookup for the Fare service (docs/api-design.md §5). */
@ApiExcludeController()
@Controller({ path: 'internal', version: '1' })
export class InternalTrailsController {
  constructor(@InjectRepository(TrailSlice) private readonly slices: Repository<TrailSlice>) {}

  @Public()
  @Get('trails/:rideId')
  async get(@Param('rideId') rideId: string) {
    const slice = await this.slices.findOne({ where: { rideId } });
    if (!slice) throw new NotFoundException({ code: 'TRAIL_NOT_FOUND', message: 'No trail for this ride' });
    return { ride_id: rideId, distance_m: slice.distanceM, point_count: slice.pointCount };
  }
}
