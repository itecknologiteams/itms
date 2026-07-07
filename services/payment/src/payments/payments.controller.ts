import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsObject, IsString } from 'class-validator';
import { CurrentUser, Principal, Public, Role, Roles } from '@itms/auth';
import { PayDto } from './dto';
import { PaymentsService } from './payments.service';

class CallbackDto {
  @IsString()
  ride_id!: string;

  @IsString()
  txn_ref!: string;

  @IsEnum(['success', 'failed'])
  status!: 'success' | 'failed';

  @IsObject()
  raw!: Record<string, unknown>;
}

@ApiTags('payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('rides/:id/pay')
  @Roles(Role.Passenger)
  @ApiOperation({ summary: 'Pay the calculated fare via JazzCash or card' })
  pay(@Param('id') rideId: string, @Body() dto: PayDto) {
    return this.payments.pay(rideId, dto.method);
  }

  @Post('rides/:id/cash-received')
  @Roles(Role.Driver)
  @ApiOperation({ summary: 'Driver confirms cash was received' })
  cashReceived(@Param('id') rideId: string, @CurrentUser() user: Principal) {
    return this.payments.cashReceived(rideId, user.userId);
  }

  @Get('rides/:id/receipt')
  @ApiOperation({ summary: 'Get the receipt for a completed ride payment' })
  receipt(@Param('id') rideId: string) {
    return this.payments.receipt(rideId);
  }

  @Public()
  @ApiExcludeEndpoint()
  @Post('callbacks/jazzcash')
  jazzcashCallback(@Body() dto: CallbackDto, @Headers('x-signature') sig?: string) {
    return this.payments.handleCallback('jazzcash', dto, sig);
  }

  @Public()
  @ApiExcludeEndpoint()
  @Post('callbacks/card')
  cardCallback(@Body() dto: CallbackDto, @Headers('x-signature') sig?: string) {
    return this.payments.handleCallback('card', dto, sig);
  }
}
