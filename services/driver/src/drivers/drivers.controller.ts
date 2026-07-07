import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Principal, Role, Roles } from '@itms/auth';
import { DriverStatus } from '../entities/driver.entity';
import { DocumentReviewStatus } from '../entities/driver-document.entity';
import { AssignVehicleDto, OnboardDriverDto, SetOnlineDto, SuspendDriverDto } from './dto';
import { DriversService } from './drivers.service';

@ApiTags('drivers')
@Controller({ path: 'drivers', version: '1' })
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Post()
  @Roles(Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper)
  @ApiOperation({ summary: 'Onboard a new driver (provisions their Auth identity)' })
  onboard(@Body() dto: OnboardDriverDto) {
    return this.drivers.onboard(dto);
  }

  @Get()
  @Roles(Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper)
  list(@Query('status') status?: DriverStatus) {
    return this.drivers.list(status);
  }

  @Get('me')
  @Roles(Role.Driver)
  @ApiOperation({ summary: "The calling driver's own profile" })
  me(@CurrentUser() user: Principal) {
    return this.drivers.getByAuthUserId(user.userId);
  }

  @Get(':id')
  @Roles(Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper)
  get(@Param('id') id: string) {
    return this.drivers.get(id);
  }

  @Post(':id/approve')
  @Roles(Role.AdminSupervisor, Role.AdminSuper)
  approve(@Param('id') id: string) {
    return this.drivers.approve(id);
  }

  @Post(':id/reject')
  @Roles(Role.AdminSupervisor, Role.AdminSuper)
  reject(@Param('id') id: string) {
    return this.drivers.reject(id);
  }

  @Post(':id/vehicle')
  @Roles(Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper)
  @ApiOperation({ summary: 'Assign a vehicle to a driver' })
  assignVehicle(@Param('id') id: string, @Body() dto: AssignVehicleDto) {
    return this.drivers.assignVehicle(id, dto.vehicle_id);
  }

  @Patch('me/status')
  @Roles(Role.Driver)
  @ApiOperation({ summary: 'Driver toggles online/offline' })
  async setOnline(@Body() dto: SetOnlineDto, @CurrentUser() user: Principal) {
    const driver = await this.drivers.getByAuthUserId(user.userId);
    return this.drivers.setOnline(driver.id, dto.online);
  }

  @Post(':id/suspend')
  @Roles(Role.AdminSupervisor, Role.AdminSuper)
  suspend(@Param('id') id: string, @Body() dto: SuspendDriverDto, @CurrentUser() user: Principal) {
    return this.drivers.suspend(id, dto.reason, user.userId);
  }

  @Post(':id/lift-suspension')
  @Roles(Role.AdminSupervisor, Role.AdminSuper)
  liftSuspension(@Param('id') id: string, @CurrentUser() user: Principal) {
    return this.drivers.liftSuspension(id, user.userId);
  }

  @Get(':id/documents')
  @Roles(Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper)
  documents(@Param('id') id: string) {
    return this.drivers.listDocuments(id);
  }

  @Post(':id/documents/:documentId/review')
  @Roles(Role.AdminSupervisor, Role.AdminSuper)
  reviewDocument(
    @Param('documentId') documentId: string,
    @Body() body: { status: DocumentReviewStatus },
    @CurrentUser() user: Principal,
  ) {
    return this.drivers.reviewDocument(documentId, body.status, user.userId);
  }
}
