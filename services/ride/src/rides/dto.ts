import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../entities/ride.entity';

export class PointDto {
  @ApiProperty() @IsNumber() @Min(-90) @Max(90) lat!: number;
  @ApiProperty() @IsNumber() @Min(-180) @Max(180) lon!: number;
}

export class CreateRideDto {
  @ApiProperty({ type: PointDto })
  @ValidateNested()
  @Type(() => PointDto)
  pickup!: PointDto;

  @ApiPropertyOptional({ type: PointDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PointDto)
  dropoff?: PointDto;
}

export class CancelRideDto {
  @ApiProperty()
  @IsString()
  @Length(2, 200)
  reason!: string;
}

export class StartRideDto {
  @ApiProperty({ description: 'Driver current position, checked against pickup proximity' })
  @ValidateNested()
  @Type(() => PointDto)
  position!: PointDto;
}

export class NoShowDto {
  @ApiProperty({ type: PointDto })
  @ValidateNested()
  @Type(() => PointDto)
  position!: PointDto;
}

export class RatingDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  stars!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  comment?: string;
}

export class SosDto {
  @ApiProperty({ type: PointDto })
  @ValidateNested()
  @Type(() => PointDto)
  position!: PointDto;
}

export class PayMethodDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}
