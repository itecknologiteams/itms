import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ConflictError, DomainRuleError, UnauthorizedError } from '@itms/common';
import { Role } from '@itms/auth';
import { EventNames, OutboxEntity } from '@itms/events';
import { authenticator } from 'otplib';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { DataSource, Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { OtpService } from '../otp/otp.service';
import { TokenService } from '../tokens/token.service';
import { User, UserStatus } from '../entities/user.entity';
import { Device } from '../entities/device.entity';
import { OtpPurpose } from '../entities/otp-challenge.entity';
import { AUTH_CONFIG } from '../config/configuration';
import type { AuthConfig } from '../config/configuration';
import { Inject } from '@nestjs/common';
import { DeviceInfoDto, TokenPairResponse } from './dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
  ) {}

  requestOtp(phone: string, purpose: OtpPurpose) {
    return this.otp.request(phone, purpose);
  }

  /**
   * Verify an OTP and log the user in. Passengers self-register on first login;
   * driver/admin accounts must be pre-provisioned (see provisionUser). Emits
   * user.registered via the outbox for genuinely new users.
   */
  async verifyOtp(
    phone: string,
    code: string,
    purpose: OtpPurpose,
    device?: DeviceInfoDto,
  ): Promise<TokenPairResponse> {
    await this.otp.verify(phone, code, purpose);

    let user = await this.users.findOne({ where: { phone } });
    let isNewUser = false;

    if (!user) {
      if (purpose === OtpPurpose.Login) {
        throw new DomainRuleError('USER_NOT_FOUND', 'No account for this number; please register');
      }
      user = await this.registerPassenger(phone);
      isNewUser = true;
    }

    if (user.status === UserStatus.Blocked) {
      throw new UnauthorizedError('USER_BLOCKED', 'This account is blocked');
    }

    if (!user.phoneVerifiedAt) {
      user.phoneVerifiedAt = new Date();
    }
    user.lastLoginAt = new Date();
    await this.users.save(user);

    const deviceId = await this.bindDevice(user, device);
    return this.tokens.issuePair(user.id, user.role, deviceId, isNewUser);
  }

  /** Self-service passenger registration, transactional with the outbox event. */
  private async registerPassenger(phone: string): Promise<User> {
    return this.dataSource.transaction(async (mgr) => {
      const user = mgr.create(User, {
        id: uuidv7(),
        phone,
        phoneVerifiedAt: new Date(),
        email: null,
        passwordHash: null,
        role: Role.Passenger,
        status: UserStatus.Active,
        totpSecret: null,
        lastLoginAt: new Date(),
      });
      await mgr.save(user);
      await mgr.save(mgr.create(OutboxEntity, {
        id: uuidv7(),
        eventName: EventNames.UserRegistered,
        payload: { user_id: user.id, role: user.role, phone: user.phone },
        sentAt: null,
      }));
      return user;
    });
  }

  /**
   * Internal: provision a user with a specific role (called by Driver/Admin
   * services during onboarding). Idempotent on phone.
   */
  async provisionUser(phone: string, role: Role, email?: string): Promise<{ user_id: string }> {
    const existing = await this.users.findOne({ where: { phone } });
    if (existing) {
      if (existing.role !== role) {
        throw new ConflictError('PHONE_ROLE_CONFLICT', 'Phone already registered with another role');
      }
      return { user_id: existing.id };
    }
    const user = await this.users.save(
      this.users.create({
        id: uuidv7(),
        phone,
        email: email ?? null,
        role,
        status: UserStatus.Active,
      }),
    );
    return { user_id: user.id };
  }

  async refresh(refreshToken: string): Promise<TokenPairResponse> {
    return this.tokens.rotate(refreshToken);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revoke(refreshToken);
  }

  /** Step 1 of admin auth: verify credentials, return a short-lived TOTP challenge. */
  async adminLogin(email: string, password: string): Promise<{ totp_required: true; challenge: string }> {
    const user = await this.users.findOne({ where: { email } });
    const genericFail = new UnauthorizedError('ADMIN_CREDENTIALS', 'Invalid credentials');
    if (!user || !user.passwordHash || !this.isAdmin(user.role)) throw genericFail;

    const ok = await argon2.verify(user.passwordHash, password).catch(() => false);
    if (!ok) throw genericFail;
    if (!user.totpSecret) {
      throw new DomainRuleError('TOTP_NOT_ENROLLED', 'Two-factor not set up; contact super admin');
    }

    const challenge = jwt.sign({ stage: 'totp' }, this.config.jwt.privateKey, {
      algorithm: 'RS256',
      subject: user.id,
      issuer: this.config.jwt.issuer,
      expiresIn: '2m',
    });
    return { totp_required: true, challenge };
  }

  /** Step 2 of admin auth: verify the TOTP code against the challenge. */
  async adminTotp(challenge: string, code: string): Promise<TokenPairResponse> {
    let userId: string;
    try {
      const claims = jwt.verify(challenge, this.config.jwt.publicKey, {
        algorithms: ['RS256'],
        issuer: this.config.jwt.issuer,
      }) as { sub: string; stage?: string };
      if (claims.stage !== 'totp') throw new Error('wrong stage');
      userId = claims.sub;
    } catch {
      throw new UnauthorizedError('TOTP_CHALLENGE_INVALID', 'Challenge expired or invalid');
    }

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || !user.totpSecret) throw new UnauthorizedError('TOTP_INVALID', 'Invalid code');

    if (!authenticator.verify({ token: code, secret: user.totpSecret })) {
      throw new UnauthorizedError('TOTP_INVALID', 'Invalid code');
    }

    user.lastLoginAt = new Date();
    await this.users.save(user);
    return this.tokens.issuePair(user.id, user.role);
  }

  private isAdmin(role: Role): boolean {
    return [Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper].includes(role);
  }

  /**
   * Upsert the caller's device. Drivers are limited to one active device: a new
   * device deactivates the others (docs/specs.md D-01). Returns the device id.
   */
  private async bindDevice(user: User, device?: DeviceInfoDto): Promise<string | undefined> {
    if (!device) return undefined;
    if (user.role === Role.Driver) {
      await this.devices.update({ userId: user.id, isActive: true }, { isActive: false });
    }
    const row = await this.devices.save(
      this.devices.create({
        id: uuidv7(),
        userId: user.id,
        platform: device.platform ?? null,
        fcmToken: device.fcm_token ?? null,
        model: device.model ?? null,
        appVersion: device.app_version ?? null,
        isActive: true,
        lastSeenAt: new Date(),
      }),
    );
    return row.id;
  }
}
