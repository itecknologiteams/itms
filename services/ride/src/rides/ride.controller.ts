import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Principal, Role, Roles } from '@itms/auth';
import { CancelRideDto, CreateRideDto, NoShowDto, RatingDto, SosDto, StartRideDto } from './dto';
import { RideService } from './ride.service';

@ApiTags('rides')
@Controller({ path: 'rides', version: '1' })
export class RideController {
  constructor(private readonly rides: RideService) {}

  @Post()
  @Roles(Role.Passenger)
  @HttpCode(202)
  @ApiOperation({ summary: 'Request a ride (no fare shown pre-ride)' })
  create(@CurrentUser() user: Principal, @Body() dto: CreateRideDto) {
    return this.rides.requestRide(user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get current ride state (owner or assigned driver)' })
  get(@Param('id') id: string, @CurrentUser() user: Principal) {
    return this.rides.getForActor(id, user.userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a ride (passenger or driver)' })
  async cancel(@Param('id') id: string, @Body() dto: CancelRideDto, @CurrentUser() user: Principal) {
    return user.role === Role.Driver
      ? this.rides.driverCancel(id, user.userId, dto.reason)
      : this.rides.cancelByPassenger(id, user.userId, dto.reason);
  }

  @Post(':id/accept')
  @Roles(Role.Driver)
  @ApiOperation({ summary: 'Driver accepts an offer (atomic first-accept-wins)' })
  accept(@Param('id') id: string, @CurrentUser() user: Principal) {
    return this.rides.accept(id, user.userId);
  }

  @Post(':id/arrived')
  @Roles(Role.Driver)
  arrived(@Param('id') id: string, @CurrentUser() user: Principal) {
    return this.rides.arrived(id, user.userId);
  }

  @Post(':id/start')
  @Roles(Role.Driver)
  @ApiOperation({ summary: 'Start the ride (guarded by pickup proximity)' })
  start(@Param('id') id: string, @Body() dto: StartRideDto, @CurrentUser() user: Principal) {
    return this.rides.start(id, user.userId, dto.position);
  }

  @Post(':id/end')
  @Roles(Role.Driver)
  @ApiOperation({ summary: 'End the ride (triggers fare calculation saga)' })
  end(@Param('id') id: string, @CurrentUser() user: Principal) {
    return this.rides.end(id, user.userId);
  }

  @Post(':id/no-show')
  @Roles(Role.Driver)
  noShow(@Param('id') id: string, @Body() dto: NoShowDto, @CurrentUser() user: Principal) {
    return this.rides.noShow(id, user.userId, dto.position);
  }

  @Post(':id/rating')
  @Roles(Role.Passenger)
  rate(@Param('id') id: string, @Body() dto: RatingDto, @CurrentUser() user: Principal) {
    return this.rides.rate(id, user.userId, dto);
  }

  @Post(':id/sos')
  @ApiOperation({ summary: 'Raise SOS during an active ride' })
  sos(@Param('id') id: string, @Body() dto: SosDto, @CurrentUser() user: Principal) {
    return this.rides.raiseSos(id, user.userId, dto.position);
  }
}
