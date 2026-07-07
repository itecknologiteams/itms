import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, Role, Roles } from '@itms/auth';
import { WriteAuditLogDto } from './dto';
import { AuditLogService } from './audit-log.service';

@ApiTags('audit-log')
@Controller({ path: 'admin', version: '1' })
export class AuditLogController {
  constructor(private readonly audit: AuditLogService) {}

  /** Internal API: called by the acting service at the moment of an admin
   * mutation (docs/security.md §6). Network-locked, never routed via Kong. */
  @Public()
  @ApiExcludeEndpoint()
  @Post('internal/audit-log')
  write(@Body() dto: WriteAuditLogDto) {
    return this.audit.record(dto);
  }

  @Get('audit-log')
  @Roles(Role.AdminSuper)
  @ApiOperation({ summary: 'Filterable audit trail of admin actions' })
  list(@Query('entity') entity?: string, @Query('admin_id') adminId?: string) {
    return this.audit.list({ entity, adminId });
  }
}
