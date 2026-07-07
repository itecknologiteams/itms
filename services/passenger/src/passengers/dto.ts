import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { Language } from '../entities/passenger.entity';
import { SavedMethodType } from '../entities/saved-method.entity';

export class CompleteProfileDto {
  @ApiProperty()
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: Language })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: Language })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;
}

export class AddSavedMethodDto {
  @ApiProperty({ enum: SavedMethodType })
  @IsEnum(SavedMethodType)
  type!: SavedMethodType;

  @ApiProperty({ description: 'Gateway-issued token, never raw card/wallet data' })
  @IsString()
  gateway_token!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;
}
