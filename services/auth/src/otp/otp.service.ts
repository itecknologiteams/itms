import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DomainRuleError, RateLimitError } from '@itms/common';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { AUTH_CONFIG, AuthConfig } from '../config/configuration';
import { OtpChallenge, OtpPurpose } from '../entities/otp-challenge.entity';

/**
 * OTP issuance and verification (docs/security.md §1).
 * - Codes are never stored in plaintext (HMAC-SHA256 with a server pepper).
 * - Per-phone rate limiting over a rolling window.
 * - Constant-time comparison; bounded attempts per challenge.
 *
 * In development, OTP_DEV_ECHO logs the code instead of sending SMS. The SMS
 * gateway integration is Notification Service's responsibility (OPEN-3).
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  // Dev-only pepper; production reads OTP_PEPPER from the secret manager.
  private readonly pepper = process.env.OTP_PEPPER ?? 'dev-otp-pepper';
  // Plaintext codes are NEVER persisted (only the HMAC is stored, above) — this
  // cache exists purely so automated dev/CI testing (scripts/smoke-test.mjs)
  // can retrieve a code without an SMS gateway. Populated only when devEcho is
  // true, which is already documented as never-enabled-in-production.
  private readonly devEchoCache = new Map<string, { code: string; expiresAt: number }>();

  constructor(
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
    @InjectRepository(OtpChallenge) private readonly repo: Repository<OtpChallenge>,
  ) {}

  private hashCode(code: string): string {
    return createHmac('sha256', this.pepper).update(code).digest('hex');
  }

  /** Create and (in prod) dispatch an OTP. Returns the challenge id + expiry. */
  async request(
    phone: string,
    purpose: OtpPurpose,
  ): Promise<{ challenge_id: string; expires_in: number }> {
    const windowStart = new Date(Date.now() - this.config.otp.rateWindowSeconds * 1000);
    const recent = await this.repo.count({
      where: { phone, createdAt: MoreThan(windowStart) },
    });
    if (recent >= this.config.otp.maxAttempts) {
      throw new RateLimitError('OTP_RATE_LIMITED', 'Too many OTP requests; try again later');
    }

    const code = this.generateCode();
    const challenge = this.repo.create({
      id: uuidv7(),
      phone,
      codeHash: this.hashCode(code),
      purpose,
      expiresAt: new Date(Date.now() + this.config.otp.ttlSeconds * 1000),
      attempts: 0,
      consumedAt: null,
    });
    await this.repo.save(challenge);

    if (this.config.otp.devEcho) {
      // NEVER enabled in production (guarded by env). Aids local testing.
      this.logger.warn(`[DEV OTP] ${phone} (${purpose}) → ${code}`);
      this.devEchoCache.set(phone, { code, expiresAt: Date.now() + this.config.otp.ttlSeconds * 1000 });
    }

    return { challenge_id: challenge.id, expires_in: this.config.otp.ttlSeconds };
  }

  /** Dev/CI-only: retrieve the most recently issued code for a phone. Returns
   * null when devEcho is off (production) or nothing is cached/it expired. */
  peekDevCode(phone: string): string | null {
    if (!this.config.otp.devEcho) return null;
    const entry = this.devEchoCache.get(phone);
    if (!entry || entry.expiresAt < Date.now()) return null;
    return entry.code;
  }

  /** Verify a code for the most recent unconsumed challenge. */
  async verify(phone: string, code: string, purpose: OtpPurpose): Promise<void> {
    const challenge = await this.repo.findOne({
      where: { phone, purpose, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (!challenge) {
      throw new DomainRuleError('OTP_NOT_FOUND', 'No pending code; request a new one');
    }
    if (challenge.expiresAt.getTime() < Date.now()) {
      throw new DomainRuleError('OTP_EXPIRED', 'Code expired; request a new one');
    }
    if (challenge.attempts >= this.config.otp.maxAttempts) {
      throw new RateLimitError('OTP_ATTEMPTS_EXCEEDED', 'Too many attempts; request a new code');
    }

    challenge.attempts += 1;
    const provided = Buffer.from(this.hashCode(code));
    const expected = Buffer.from(challenge.codeHash);
    const matches = provided.length === expected.length && timingSafeEqual(provided, expected);

    if (!matches) {
      await this.repo.save(challenge);
      throw new DomainRuleError('OTP_INVALID', 'Incorrect code');
    }

    challenge.consumedAt = new Date();
    await this.repo.save(challenge);
  }

  private generateCode(): string {
    const max = 10 ** this.config.otp.length;
    return randomInt(0, max).toString().padStart(this.config.otp.length, '0');
  }
}
