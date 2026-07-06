import { Body, Controller, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Public } from '@itms/auth';
import { MatchingService } from './matching.service';

class ClaimDto {
  @IsUUID()
  ride_id!: string;

  @IsUUID()
  driver_id!: string;
}

/**
 * Internal claim endpoint used by the Ride service when a driver taps Accept
 * (docs/architecture.md §3.4). Network-locked (NetworkPolicy), never via Kong.
 */
@ApiExcludeController()
@Controller({ path: 'internal', version: '1' })
export class InternalDispatchController {
  constructor(private readonly matching: MatchingService) {}

  @Public()
  @Post('claim')
  claim(@Body() dto: ClaimDto) {
    return this.matching.claim(dto.ride_id, dto.driver_id);
  }
}
