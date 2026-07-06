import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { CurrentUser, Principal, Role, Roles } from '@itms/auth';
import { ViolationStatus } from '../entities/violation.entity';
import { ViolationsService } from './violations.service';

class ResolveDto {
  @IsString()
  note!: string;
}

@ApiTags('violations')
@Controller({ path: 'violations', version: '1' })
export class ViolationsController {
  constructor(private readonly violations: ViolationsService) {}

  @Get()
  @Roles(Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper)
  @ApiOperation({ summary: 'List violations, optionally filtered by status/zone' })
  @ApiQuery({ name: 'status', enum: ViolationStatus, required: false })
  @ApiQuery({ name: 'zone', required: false })
  list(@Query('status') status?: ViolationStatus, @Query('zone') zone?: string) {
    return this.violations.list({ status, zoneId: zone });
  }

  @Post(':id/ack')
  @Roles(Role.AdminSupervisor, Role.AdminSuper)
  ack(@Param('id') id: string, @CurrentUser() user: Principal) {
    return this.violations.acknowledge(id, user.userId);
  }

  @Post(':id/resolve')
  @Roles(Role.AdminSupervisor, Role.AdminSuper)
  resolve(@Param('id') id: string, @Body() dto: ResolveDto) {
    return this.violations.resolve(id, dto.note);
  }

  @Post(':id/escalate')
  @Roles(Role.AdminSupervisor, Role.AdminSuper)
  escalate(@Param('id') id: string) {
    return this.violations.escalate(id);
  }
}
