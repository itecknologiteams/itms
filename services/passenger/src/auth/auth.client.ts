import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { PASSENGER_CONFIG, PassengerConfig } from '../config/configuration';

/**
 * Resolves the authenticated caller's phone from Auth (docs/architecture.md §2:
 * database-per-service — Passenger never reads auth_db directly). The passenger's
 * JWT carries only `sub`/`role`; the phone that was OTP-verified lives in Auth.
 */
@Injectable()
export class AuthClient {
  constructor(
    @Inject(PASSENGER_CONFIG) private readonly config: PassengerConfig,
    private readonly http: HttpService,
  ) {}

  async getPhone(authUserId: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.get<{ phone: string }>(`${this.config.authBaseUrl}/v1/internal/users/${authUserId}`, {
        timeout: 3000,
      }),
    );
    return res.data.phone;
  }
}
