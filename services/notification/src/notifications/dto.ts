import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsObject, IsString, IsUUID } from 'class-validator';
import { BroadcastAudience } from '../entities/broadcast.entity';
import { Channel, Lang } from '../entities/template.entity';

export class NotifyDto {
  @ApiProperty({ description: "The recipient's Auth user id" })
  @IsUUID()
  auth_user_id!: string;

  @ApiProperty()
  @IsString()
  template_key!: string;

  @ApiProperty({ enum: Channel })
  @IsEnum(Channel)
  channel!: Channel;

  @ApiProperty({ enum: Lang })
  @IsEnum(Lang)
  lang!: Lang;

  @ApiProperty({ type: Object, required: false })
  @IsObject()
  variables!: Record<string, unknown>;

  @ApiProperty({ description: "Recipient's device token (push) or phone (SMS)" })
  @IsString()
  destination!: string;
}

export class BroadcastDto {
  @ApiProperty({ enum: BroadcastAudience })
  @IsEnum(BroadcastAudience)
  audience!: BroadcastAudience;

  @ApiProperty()
  @IsString()
  template_key!: string;
}
