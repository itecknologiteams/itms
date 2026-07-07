import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';
import { RoundingRule } from '../entities/fare-config.entity';

export class CreateFareConfigDto {
  @ApiProperty({ description: 'Base fare in PKR paisa' })
  @IsInt()
  @Min(0)
  base_paisa!: number;

  @ApiProperty({ description: 'Per-km rate in PKR paisa' })
  @IsInt()
  @Min(0)
  per_km_paisa!: number;

  @ApiProperty({ description: 'Per-minute rate in PKR paisa' })
  @IsInt()
  @Min(0)
  per_min_paisa!: number;

  @ApiProperty({ description: 'Minimum fare in PKR paisa' })
  @IsInt()
  @Min(0)
  minimum_paisa!: number;

  @ApiPropertyOptional({ enum: RoundingRule, default: RoundingRule.Nearest10 })
  @IsOptional()
  @IsEnum(RoundingRule)
  rounding?: RoundingRule;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  night_multiplier?: number;
}
