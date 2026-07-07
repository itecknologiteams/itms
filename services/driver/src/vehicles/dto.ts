import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class OnboardVehicleDto {
  @ApiProperty()
  @IsString()
  @Length(2, 20)
  plate_no!: string;

  @ApiProperty()
  @IsString()
  model!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty()
  @IsString()
  tracker_device_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  city_id?: string;
}
