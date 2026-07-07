import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role, Roles } from '@itms/auth';
import { VehicleStatus } from '../entities/vehicle.entity';
import { OnboardVehicleDto } from './dto';
import { VehiclesService } from './vehicles.service';

class SetVehicleStatusDto {
  @IsEnum(VehicleStatus)
  status!: VehicleStatus;
}

@ApiTags('vehicles')
@Controller({ path: 'vehicles', version: '1' })
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Post()
  @Roles(Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper)
  @ApiOperation({ summary: 'Onboard a new vehicle' })
  onboard(@Body() dto: OnboardVehicleDto) {
    return this.vehicles.onboard(dto);
  }

  @Get()
  @Roles(Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper)
  list() {
    return this.vehicles.list();
  }

  @Get(':id')
  @Roles(Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper)
  get(@Param('id') id: string) {
    return this.vehicles.get(id);
  }

  @Patch(':id/status')
  @Roles(Role.AdminSupervisor, Role.AdminSuper)
  setStatus(@Param('id') id: string, @Body() dto: SetVehicleStatusDto) {
    return this.vehicles.setStatus(id, dto.status);
  }
}
