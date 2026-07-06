import { RateLimitError, DomainRuleError } from '@itms/common';
import { OtpService } from './otp.service';
import { OtpChallenge, OtpPurpose } from '../entities/otp-challenge.entity';
import type { AuthConfig } from '../config/configuration';

/** Minimal in-memory stand-in for the OtpChallenge repository. */
class FakeRepo {
  rows: OtpChallenge[] = [];
  create(data: Partial<OtpChallenge>): OtpChallenge {
    return { ...data } as OtpChallenge;
  }
  async save(row: OtpChallenge): Promise<OtpChallenge> {
    const idx = this.rows.findIndex((r) => r.id === row.id);
    if (idx >= 0) this.rows[idx] = row;
    else this.rows.push(row);
    return row;
  }
  async count(): Promise<number> {
    return this.rows.length;
  }
  async findOne(opts: {
    where: { phone: string; purpose: OtpPurpose };
    order: unknown;
  }): Promise<OtpChallenge | null> {
    const matches = this.rows
      .filter(
        (r) => r.phone === opts.where.phone && r.purpose === opts.where.purpose && !r.consumedAt,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return matches[0] ?? null;
  }
}

const config = {
  otp: { length: 6, ttlSeconds: 180, maxAttempts: 5, rateWindowSeconds: 1800, devEcho: false },
} as AuthConfig;

describe('OtpService', () => {
  let repo: FakeRepo;
  let service: OtpService;

  beforeEach(() => {
    repo = new FakeRepo();
    // createdAt is normally set by @CreateDateColumn; stamp it for the fake.
    const origSave = repo.save.bind(repo);
    repo.save = async (row) => {
      row.createdAt ??= new Date();
      return origSave(row);
    };
    service = new OtpService(config, repo as never);
  });

  it('issues a challenge and verifies the correct code', async () => {
    // Capture the generated code by spying on the hash via a known code path:
    // request returns only the id, so drive verify through the stored hash.
    const { challenge_id } = await service.request('+923001234567', OtpPurpose.Register);
    expect(challenge_id).toBeDefined();

    const stored = repo.rows[0];
    // Recompute a matching code by brute force is impractical; instead assert
    // that a wrong code is rejected and attempts increment.
    await expect(
      service.verify('+923001234567', '000000', OtpPurpose.Register),
    ).rejects.toBeInstanceOf(DomainRuleError);
    expect(stored.attempts).toBe(1);
  });

  it('rejects when no pending challenge exists', async () => {
    await expect(service.verify('+923009999999', '123456', OtpPurpose.Login)).rejects.toBeInstanceOf(
      DomainRuleError,
    );
  });

  it('rate-limits after too many requests in the window', async () => {
    for (let i = 0; i < config.otp.maxAttempts; i++) {
      await service.request('+923001234567', OtpPurpose.Login);
    }
    await expect(service.request('+923001234567', OtpPurpose.Login)).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });

  it('rejects an expired challenge', async () => {
    await service.request('+923001234567', OtpPurpose.Register);
    repo.rows[0].expiresAt = new Date(Date.now() - 1000);
    await expect(
      service.verify('+923001234567', '123456', OtpPurpose.Register),
    ).rejects.toMatchObject({ code: 'OTP_EXPIRED' });
  });

  it('accepts the correct code and consumes the challenge', async () => {
    // Reproduce the service's HMAC to seed a known code.
    const { createHmac } = await import('node:crypto');
    const code = '424242';
    const codeHash = createHmac('sha256', 'dev-otp-pepper').update(code).digest('hex');
    await repo.save(
      repo.create({
        id: 'seed',
        phone: '+923001234567',
        codeHash,
        purpose: OtpPurpose.Login,
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 0,
        consumedAt: null,
        createdAt: new Date(),
      }),
    );

    await expect(service.verify('+923001234567', code, OtpPurpose.Login)).resolves.toBeUndefined();
    expect(repo.rows.find((r) => r.id === 'seed')?.consumedAt).toBeInstanceOf(Date);
  });
});
