import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DomainRuleError, NotFoundError } from '@itms/common';
import { createEnvelope, EventBusService, EventNames } from '@itms/events';
import { Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { DOCUMENT_CONFIG, DocumentConfig } from '../config/configuration';
import { bucketKey, isAllowedMime } from '../domain/bucket-key';
import { Media, ScanStatus } from '../entities/media.entity';
import { MEDIA_STORAGE, MediaStorage } from '../storage/media-storage.interface';
import { FinalizeDto, UploadUrlRequestDto } from './dto';

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DOCUMENT_CONFIG) private readonly config: DocumentConfig,
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage,
    @InjectRepository(Media) private readonly media: Repository<Media>,
    private readonly bus: EventBusService,
  ) {}

  async requestUploadUrl(dto: UploadUrlRequestDto, uploadedBy: string) {
    if (!isAllowedMime(dto.kind, dto.mime)) {
      throw new DomainRuleError('MIME_NOT_ALLOWED', `${dto.mime} is not allowed for ${dto.kind}`);
    }
    const mediaId = uuidv7();
    const key = bucketKey(this.config.env, dto.kind, dto.owner_id, mediaId);

    await this.media.save(
      this.media.create({
        id: mediaId,
        ownerType: dto.owner_type,
        ownerId: dto.owner_id,
        kind: dto.kind,
        bucketKey: key,
        mime: dto.mime,
        sizeBytes: null,
        sha256: null,
        scanStatus: ScanStatus.Pending,
        uploadedBy,
        finalizedAt: null,
      }),
    );

    const uploadUrl = await this.storage.presignPutUrl(key, dto.mime, this.config.signedUrlTtlSeconds);
    return { media_id: mediaId, upload_url: uploadUrl, expires_in: this.config.signedUrlTtlSeconds };
  }

  async finalize(mediaId: string, dto: FinalizeDto) {
    const record = await this.require(mediaId);
    record.sha256 = dto.sha256;
    record.sizeBytes = String(dto.size_bytes);
    record.finalizedAt = new Date();
    // Real deployment: enqueue an antivirus scan job; scan_status transitions
    // pending -> clean/infected asynchronously. Stub marks clean immediately.
    record.scanStatus = ScanStatus.Clean;
    await this.media.save(record);

    await this.bus.publish(
      createEnvelope({
        eventName: EventNames.DocumentUploaded,
        producer: 'document',
        payload: { media_id: mediaId, owner_id: record.ownerId, kind: record.kind, status: 'uploaded' },
      }),
    );
    return record;
  }

  async getDownloadUrl(mediaId: string) {
    const record = await this.require(mediaId);
    if (record.scanStatus === ScanStatus.Infected) {
      throw new DomainRuleError('MEDIA_QUARANTINED', 'This file failed the security scan');
    }
    const url = await this.storage.presignGetUrl(record.bucketKey, this.config.signedUrlTtlSeconds);
    return { media_id: mediaId, url, expires_in: this.config.signedUrlTtlSeconds };
  }

  private async require(mediaId: string): Promise<Media> {
    const record = await this.media.findOne({ where: { id: mediaId } });
    if (!record) throw new NotFoundError('MEDIA_NOT_FOUND', 'Media not found');
    return record;
  }
}
