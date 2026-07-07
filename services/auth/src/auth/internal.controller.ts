import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, Matches } from 'class-validator';
import { Public, Role } from '@itms/auth';
import { AuthService } from './auth.service';

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
  constructor(private readonly auth: AuthService) {}

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
}
