import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, Length, Matches } from 'class-validator';

const PHONE_REGEX = /^\+92\d{10}$/;

export class OnboardDriverDto {
  @ApiProperty({ example: '+923001234567' })
  @Matches(PHONE_REGEX)
  phone!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cnic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  license_no?: string;

  @ApiPropertyOptional({ description: 'ISO date' })
  @IsOptional()
  @IsDateString()
  license_expiry?: string;
}

export class AssignVehicleDto {
  @ApiProperty()
  @IsString()
  vehicle_id!: string;
}

export class SuspendDriverDto {
  @ApiProperty()
  @IsString()
  @Length(2, 240)
  reason!: string;
}

export class SetOnlineDto {
  @ApiProperty()
  @IsBoolean()
  online!: boolean;
}
