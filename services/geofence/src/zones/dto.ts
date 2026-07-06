import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ZoneStatus } from '../entities/zone.entity';

export class GeoJsonPolygonDto {
  @ApiProperty({ enum: ['Polygon'] })
  @IsIn(['Polygon'])
  type!: 'Polygon';

  @ApiProperty({
    description: 'GeoJSON Polygon coordinates: array of linear rings of [lon, lat] pairs',
    example: [
      [
        [67.02, 24.8],
        [67.03, 24.8],
        [67.03, 24.81],
        [67.02, 24.81],
        [67.02, 24.8],
      ],
    ],
  })
  @IsArray()
  coordinates!: number[][][];
}

export class CreateZoneDto {
  @ApiProperty()
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ type: GeoJsonPolygonDto })
  @ValidateNested()
  @Type(() => GeoJsonPolygonDto)
  boundary!: GeoJsonPolygonDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  city_id?: string;
}

export class UpdateZoneDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @ApiPropertyOptional({ type: GeoJsonPolygonDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoJsonPolygonDto)
  boundary?: GeoJsonPolygonDto;

  @ApiPropertyOptional({ enum: ZoneStatus })
  @IsOptional()
  @IsEnum(ZoneStatus)
  status?: ZoneStatus;
}

export class PairVehicleDto {
  @ApiProperty()
  @IsUUID()
  zone_id!: string;
}

export class MovementPassDto {
  @ApiProperty()
  @IsUUID()
  vehicle_id!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 240)
  reason!: string;

  @ApiProperty({ description: 'ISO-8601 start' })
  @IsString()
  from_ts!: string;

  @ApiProperty({ description: 'ISO-8601 end' })
  @IsString()
  to_ts!: string;
}
