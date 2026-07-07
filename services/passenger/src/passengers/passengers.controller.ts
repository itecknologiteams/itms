import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Principal, Role, Roles } from '@itms/auth';
import { PassengerStatus } from '../entities/passenger.entity';
import { AuthClient } from '../auth/auth.client';
import { AddSavedMethodDto, CompleteProfileDto, UpdateProfileDto } from './dto';
import { PassengersService } from './passengers.service';

@ApiTags('passengers')
@Controller({ path: 'passengers', version: '1' })
export class PassengersController {
  constructor(
    private readonly passengers: PassengersService,
    private readonly authClient: AuthClient,
  ) {}

  @Post('me')
  @Roles(Role.Passenger)
  @ApiOperation({ summary: 'Complete profile after first OTP login' })
  async completeProfile(@Body() dto: CompleteProfileDto, @CurrentUser() user: Principal) {
    // Phone is resolved from Auth (the verified identity), never trusted from the client.
    const phone = await this.authClient.getPhone(user.userId);
    return this.passengers.completeProfile(user.userId, phone, dto);
  }

  @Get('me')
  @Roles(Role.Passenger)
  me(@CurrentUser() user: Principal) {
    return this.passengers.getByAuthUserId(user.userId);
  }

  @Patch('me')
  @Roles(Role.Passenger)
  async update(@Body() dto: UpdateProfileDto, @CurrentUser() user: Principal) {
    const p = await this.passengers.getByAuthUserId(user.userId);
    return this.passengers.updateProfile(p.id, dto);
  }

  @Get('me/rides')
  @Roles(Role.Passenger)
  async rides(@CurrentUser() user: Principal) {
    const p = await this.passengers.getByAuthUserId(user.userId);
    return this.passengers.rideHistory(p.id);
  }

  @Get('me/payment-methods')
  @Roles(Role.Passenger)
  async listMethods(@CurrentUser() user: Principal) {
    const p = await this.passengers.getByAuthUserId(user.userId);
    return this.passengers.listSavedMethods(p.id);
  }

  @Post('me/payment-methods')
  @Roles(Role.Passenger)
  async addMethod(@Body() dto: AddSavedMethodDto, @CurrentUser() user: Principal) {
    const p = await this.passengers.getByAuthUserId(user.userId);
    return this.passengers.addSavedMethod(p.id, dto);
  }

  @Delete('me/payment-methods/:methodId')
  @Roles(Role.Passenger)
  async removeMethod(@Param('methodId') methodId: string, @CurrentUser() user: Principal) {
    const p = await this.passengers.getByAuthUserId(user.userId);
    await this.passengers.removeSavedMethod(p.id, methodId);
    return { ok: true };
  }

  @Get(':id')
  @Roles(Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper)
  get(@Param('id') id: string) {
    return this.passengers.get(id);
  }

  @Patch(':id/block')
  @Roles(Role.AdminSupervisor, Role.AdminSuper)
  block(@Param('id') id: string) {
    return this.passengers.blockUnblock(id, PassengerStatus.Blocked);
  }

  @Patch(':id/unblock')
  @Roles(Role.AdminSupervisor, Role.AdminSuper)
  unblock(@Param('id') id: string) {
    return this.passengers.blockUnblock(id, PassengerStatus.Active);
  }
}
