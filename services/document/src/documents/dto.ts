import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID } from 'class-validator';
import { MediaKind, OwnerType } from '../entities/media.entity';

export class UploadUrlRequestDto {
  @ApiProperty({ enum: OwnerType })
  @IsEnum(OwnerType)
  owner_type!: OwnerType;

  @ApiProperty()
  @IsUUID()
  owner_id!: string;

  @ApiProperty({ enum: MediaKind })
  @IsEnum(MediaKind)
  kind!: MediaKind;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mime!: string;
}

export class FinalizeDto {
  @ApiProperty({ description: 'SHA-256 of the uploaded bytes, for integrity verification' })
  @IsString()
  sha256!: string;

  @ApiProperty()
  size_bytes!: number;
}
