import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Principal, Public, Role, Roles } from '@itms/auth';
import { CreateZoneDto, MovementPassDto, PairVehicleDto, UpdateZoneDto } from './dto';
import { ZonesService } from './zones.service';

@ApiTags('zones')
@Controller({ path: 'zones', version: '1' })
export class ZonesController {
  constructor(private readonly zones: ZonesService) {}

  @Get()
  @Roles(Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper)
  @ApiOperation({ summary: 'List all zones' })
  list() {
    return this.zones.list();
  }

  @Post()
  @Roles(Role.AdminSupervisor, Role.AdminSuper)
  @ApiOperation({ summary: 'Create a zone from a GeoJSON polygon' })
  create(@Body() dto: CreateZoneDto, @CurrentUser() user: Principal) {
    return this.zones.create(dto, user.userId);
  }

  @Get('check')
  @Public()
  @ApiOperation({ summary: 'Passenger check: is this point inside a service zone?' })
  check(@Query('lat') lat: string, @Query('lon') lon: string) {
    return this.zones.checkPoint(Number(lat), Number(lon));
  }

  @Get(':id')
  @Roles(Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper)
  get(@Param('id') id: string) {
    return this.zones.get(id);
  }

  @Patch(':id')
  @Roles(Role.AdminSuper)
  @ApiOperation({ summary: 'Edit a zone (boundary change creates a new version)' })
  update(@Param('id') id: string, @Body() dto: UpdateZoneDto, @CurrentUser() user: Principal) {
    return this.zones.update(id, dto, user.userId);
  }

  @Get(':id/vehicles')
  @Roles(Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper)
  vehicles(@Param('id') id: string) {
    return this.zones.vehiclesInZone(id);
  }

  @Put('vehicles/:vehicleId/pairing')
  @Roles(Role.AdminSupervisor, Role.AdminSuper)
  @ApiOperation({ summary: 'Re-pair a vehicle to a zone' })
  async pair(
    @Param('vehicleId') vehicleId: string,
    @Body() dto: PairVehicleDto,
    @CurrentUser() user: Principal,
  ) {
    await this.zones.pairVehicle(vehicleId, dto.zone_id, user.userId);
    return { ok: true };
  }

  @Post('movement-passes')
  @Roles(Role.AdminSupervisor, Role.AdminSuper)
  @ApiOperation({ summary: 'Grant a time-boxed out-of-zone movement pass' })
  movementPass(@Body() dto: MovementPassDto, @CurrentUser() user: Principal) {
    return this.zones.createMovementPass(dto, user.userId);
  }
}
