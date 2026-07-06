import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { OtpPurpose } from '../entities/otp-challenge.entity';

// E.164-ish Pakistani numbers, e.g. +923001234567.
const PHONE_REGEX = /^\+92\d{10}$/;

export class DeviceInfoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() platform?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fcm_token?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() app_version?: string;
}

export class OtpRequestDto {
  @ApiProperty({ example: '+923001234567' })
  @Matches(PHONE_REGEX, { message: 'phone must be a valid +92 number' })
  phone!: string;

  @ApiProperty({ enum: OtpPurpose })
  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;
}

export class OtpVerifyDto {
  @ApiProperty({ example: '+923001234567' })
  @Matches(PHONE_REGEX)
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(4, 8)
  code!: string;

  @ApiProperty({ enum: OtpPurpose })
  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;

  @ApiPropertyOptional({ type: DeviceInfoDto })
  @IsOptional()
  device?: DeviceInfoDto;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refresh_token!: string;
}

export class LogoutDto {
  @ApiProperty()
  @IsString()
  refresh_token!: string;
}

export class AdminLoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @Length(8, 128)
  password!: string;
}

export class AdminTotpDto {
  @ApiProperty()
  @IsString()
  challenge_id!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;
}

export interface TokenPairResponse {
  access: string;
  refresh: string;
  is_new_user?: boolean;
}
