import { Controller, Get, Inject, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, Role, Roles } from '@itms/auth';
import { LIVE_LOCATION_STORE, LiveLocationStore } from '../live/live-location.store';

@ApiTags('tracking')
@Controller({ path: 'tracking', version: '1' })
export class TrackingController {
  constructor(@Inject(LIVE_LOCATION_STORE) private readonly live: LiveLocationStore) {}

  @Get('vehicles/:vehicleId')
  @Roles(Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper, Role.Driver)
  @ApiOperation({ summary: 'Latest known live location of a vehicle' })
  async vehicle(@Param('vehicleId') vehicleId: string) {
    const loc = await this.live.get(vehicleId);
    if (!loc) throw new NotFoundException({ code: 'NO_LIVE_FIX', message: 'No live location' });
    return loc;
  }
}

/** Internal proximity lookup for the Dispatch service (network-locked, not via Kong). */
@Controller({ path: 'internal', version: '1' })
export class InternalTrackingController {
  constructor(@Inject(LIVE_LOCATION_STORE) private readonly live: LiveLocationStore) {}

  @Public()
  @ApiExcludeEndpoint()
  @Get('nearby')
  nearby(@Query('lat') lat: string, @Query('lon') lon: string, @Query('radius') radius: string) {
    return this.live.nearby(Number(lat), Number(lon), Number(radius ?? 3000));
  }
}
