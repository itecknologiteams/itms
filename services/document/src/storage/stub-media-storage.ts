import { Inject, Injectable } from '@nestjs/common';
import { DOCUMENT_CONFIG, DocumentConfig } from '../config/configuration';
import { MediaStorage } from './media-storage.interface';

/**
 * Deterministic stub storage adapter, same pattern as Payment's stub gateways:
 * generates a well-formed but non-cryptographic "signed" URL so the upload/
 * finalize/download handshake, DB records, and events can be built and tested
 * end-to-end now. A real S3-compatible adapter (MinIO SDK, or
 * @aws-sdk/client-s3 + s3-request-presigner against the endpoint already
 * configured in docs/techstack.md §5) plugs in behind this same interface —
 * no other code changes.
 */
@Injectable()
export class StubMediaStorage implements MediaStorage {
  constructor(@Inject(DOCUMENT_CONFIG) private readonly config: DocumentConfig) {}

  async presignPutUrl(bucketKey: string, mime: string, ttlSeconds: number): Promise<string> {
    const expires = Date.now() + ttlSeconds * 1000;
    return `${this.config.s3.endpoint}/${this.config.s3.bucket}/${bucketKey}?method=PUT&mime=${encodeURIComponent(
      mime,
    )}&expires=${expires}&stub=true`;
  }

  async presignGetUrl(bucketKey: string, ttlSeconds: number): Promise<string> {
    const expires = Date.now() + ttlSeconds * 1000;
    return `${this.config.s3.endpoint}/${this.config.s3.bucket}/${bucketKey}?method=GET&expires=${expires}&stub=true`;
  }
}
