import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Principal } from '@itms/auth';
import { FinalizeDto, UploadUrlRequestDto } from './dto';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@Controller({ path: 'documents', version: '1' })
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Request a signed URL to upload a document directly to storage' })
  requestUploadUrl(@Body() dto: UploadUrlRequestDto, @CurrentUser() user: Principal) {
    return this.documents.requestUploadUrl(dto, user.userId);
  }

  @Post(':mediaId/finalize')
  @ApiOperation({ summary: 'Confirm upload completion and trigger the scan pipeline' })
  finalize(@Param('mediaId') mediaId: string, @Body() dto: FinalizeDto) {
    return this.documents.finalize(mediaId, dto);
  }

  @Get(':mediaId')
  @ApiOperation({ summary: 'Get a signed, time-limited download URL' })
  get(@Param('mediaId') mediaId: string) {
    return this.documents.getDownloadUrl(mediaId);
  }
}
