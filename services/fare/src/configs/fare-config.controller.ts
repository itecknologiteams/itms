import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Principal, Role, Roles } from '@itms/auth';
import { CreateFareConfigDto } from './dto';
import { FareConfigService } from './fare-config.service';

@ApiTags('fare-configs')
@Controller({ path: 'fare-configs', version: '1' })
export class FareConfigController {
  constructor(private readonly configs: FareConfigService) {}

  @Get()
  @Roles(Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper)
  list() {
    return this.configs.list();
  }

  @Post()
  @Roles(Role.AdminSuper)
  @ApiOperation({ summary: 'Create a new fare config version (never edits in place)' })
  create(@Body() dto: CreateFareConfigDto, @CurrentUser() user: Principal) {
    return this.configs.create(dto, user.userId);
  }
}
