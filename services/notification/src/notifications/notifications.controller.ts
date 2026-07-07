import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Principal, Public, Role, Roles } from '@itms/auth';
import { BroadcastDto, NotifyDto } from './dto';
import { NotificationsService } from './notifications.service';
import { BroadcastsService } from './broadcasts.service';

@ApiTags('notifications')
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly broadcasts: BroadcastsService,
  ) {}

  /** Internal API: any service that has resolved a recipient's authUserId and
   * destination calls this to send (see README for the resolution rationale). */
  @Public()
  @ApiExcludeEndpoint()
  @Post('internal/notify')
  notify(@Body() dto: NotifyDto) {
    return this.notifications.notify(
      dto.auth_user_id,
      dto.template_key,
      dto.channel,
      dto.lang,
      dto.variables,
      dto.destination,
    );
  }

  @Post('broadcasts')
  @Roles(Role.AdminSuper)
  @ApiOperation({ summary: 'Broadcast an announcement to all drivers or all passengers' })
  broadcast(@Body() dto: BroadcastDto, @CurrentUser() user: Principal) {
    return this.broadcasts.create(dto.audience, dto.template_key, user.userId);
  }

  @Get('broadcasts')
  @Roles(Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper)
  listBroadcasts() {
    return this.broadcasts.list();
  }
}
