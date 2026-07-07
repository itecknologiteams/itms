import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, Matches } from 'class-validator';
import { Public, Role } from '@itms/auth';
import { AuthService } from './auth.service';
import { OtpService } from '../otp/otp.service';

class ProvisionUserDto {
  @Matches(/^\+92\d{10}$/)
  phone!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsEmail()
  email?: string;
}

/**
 * Internal-only endpoints, reachable service-to-service on the cluster network
 * (never routed through Kong; locked by NetworkPolicy — docs/api-design.md §5).
 * @Public bypasses the JWT guard; network isolation is the control here.
 */
@ApiExcludeController()
@Controller({ path: 'internal', version: '1' })
export class InternalController {
  constructor(
    private readonly auth: AuthService,
    private readonly otp: OtpService,
  ) {}

  @Public()
  @Post('users')
  provisionUser(@Body() dto: ProvisionUserDto) {
    return this.auth.provisionUser(dto.phone, dto.role, dto.email);
  }

  @Public()
  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.auth.getUserById(id);
  }

  /**
   * Dev/CI-only: retrieve the most recently issued OTP for a phone, so
   * automated testing (scripts/smoke-test.mjs) can log in without a real SMS
   * gateway. Returns 404 whenever OTP_DEV_ECHO is off — i.e. always in
   * production (docs/security.md §1).
   */
  @Public()
  @Get('otp/:phone')
  peekOtp(@Param('phone') phone: string) {
    const code = this.otp.peekDevCode(phone);
    if (!code) throw new NotFoundException({ code: 'NO_DEV_OTP', message: 'Not available' });
    return { code };
  }
}
