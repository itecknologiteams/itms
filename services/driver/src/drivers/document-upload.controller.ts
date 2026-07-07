import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Role, Roles } from '@itms/auth';
import { DocumentType } from '../entities/driver-document.entity';
import { DriversService } from './drivers.service';

class RecordDocumentDto {
  @IsEnum(DocumentType)
  type!: DocumentType;

  @IsUUID()
  media_id!: string;

  @IsOptional()
  @IsDateString()
  expiry_date?: string;
}

/**
 * Records a document already uploaded via the Document/Media service's signed-URL
 * flow (docs/api-design.md §Documents). Driver owns the review workflow; Document
 * owns the bytes.
 */
@ApiTags('drivers')
@Controller({ path: 'drivers', version: '1' })
export class DocumentUploadController {
  constructor(private readonly drivers: DriversService) {}

  @Post(':id/documents')
  @Roles(Role.Driver, Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper)
  @ApiOperation({ summary: 'Record an uploaded document for review' })
  record(@Param('id') driverId: string, @Body() dto: RecordDocumentDto) {
    return this.drivers.uploadDocumentRecord(driverId, dto.type, dto.media_id, dto.expiry_date);
  }
}
