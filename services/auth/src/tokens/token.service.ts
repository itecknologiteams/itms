import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UnauthorizedError } from '@itms/common';
import { Role } from '@itms/auth';
import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { AUTH_CONFIG, AuthConfig } from '../config/configuration';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';
import { TokenPairResponse } from '../auth/dto';

/**
 * Issues RS256 access tokens and manages rotating refresh tokens with reuse
 * detection (docs/security.md §1). Refresh tokens are opaque random strings;
 * only their SHA-256 hash is stored.
 */
@Injectable()
export class TokenService {
  constructor(
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
    @InjectRepository(RefreshToken) private readonly refreshRepo: Repository<RefreshToken>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private signAccess(userId: string, role: Role, deviceId?: string): string {
    return jwt.sign({ role, device_id: deviceId }, this.config.jwt.privateKey, {
      algorithm: 'RS256',
      subject: userId,
      issuer: this.config.jwt.issuer,
      expiresIn: this.config.jwt.accessTtl as jwt.SignOptions['expiresIn'],
    });
  }

  /** Issue a brand-new token pair, starting a fresh refresh-token family. */
  async issuePair(
    userId: string,
    role: Role,
    deviceId?: string,
    isNewUser?: boolean,
  ): Promise<TokenPairResponse> {
    const familyId = uuidv7();
    return this.mint(userId, role, familyId, deviceId, isNewUser);
  }

  /** Rotate a presented refresh token. Detects reuse and revokes the family. */
  async rotate(presented: string): Promise<TokenPairResponse> {
    const tokenHash = this.hash(presented);
    const existing = await this.refreshRepo.findOne({ where: { tokenHash } });
    if (!existing) {
      throw new UnauthorizedError('REFRESH_INVALID', 'Refresh token not recognized');
    }

    if (existing.revokedAt || existing.expiresAt.getTime() < Date.now()) {
      // Reuse of a revoked/expired token → revoke the entire family (breach response).
      await this.refreshRepo.update(
        { familyId: existing.familyId, revokedAt: undefined },
        { revokedAt: new Date() },
      );
      throw new UnauthorizedError('REFRESH_REUSED', 'Refresh token reuse detected');
    }

    existing.revokedAt = new Date();
    await this.refreshRepo.save(existing);

    // Re-derive the role from the current user so a role change takes effect on rotation.
    const user = await this.userRepo.findOne({ where: { id: existing.userId } });
    if (!user) {
      throw new UnauthorizedError('USER_GONE', 'User no longer exists');
    }
    return this.mint(user.id, user.role, existing.familyId, existing.deviceId ?? undefined);
  }

  /** Revoke a single refresh token (logout). */
  async revoke(presented: string): Promise<void> {
    const tokenHash = this.hash(presented);
    await this.refreshRepo.update({ tokenHash }, { revokedAt: new Date() });
  }

  private async mint(
    userId: string,
    role: Role,
    familyId: string,
    deviceId?: string,
    isNewUser?: boolean,
  ): Promise<TokenPairResponse> {
    const access = this.signAccess(userId, role, deviceId);
    const refresh = randomBytes(48).toString('base64url');
    const ttlMs = this.parseTtlMs(this.config.jwt.refreshTtl);

    await this.refreshRepo.save(
      this.refreshRepo.create({
        id: uuidv7(),
        userId,
        tokenHash: this.hash(refresh),
        familyId,
        deviceId: deviceId ?? null,
        expiresAt: new Date(Date.now() + ttlMs),
        revokedAt: null,
      }),
    );

    return { access, refresh, ...(isNewUser !== undefined ? { is_new_user: isNewUser } : {}) };
  }

  private parseTtlMs(ttl: string): number {
    const m = /^(\d+)([smhd])$/.exec(ttl);
    if (!m) return 30 * 24 * 3600 * 1000;
    const n = Number(m[1]);
    const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]]!;
    return n * unit;
  }
}
