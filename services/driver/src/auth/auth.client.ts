import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { DRIVER_CONFIG, DriverConfig } from '../config/configuration';

/**
 * Provisions a driver's login identity in the Auth service at onboarding
 * (docs/architecture.md §2: Auth owns identities; Driver owns the profile).
 * Calls Auth's internal, network-locked /internal/users endpoint.
 */
@Injectable()
export class AuthClient {
  constructor(
    @Inject(DRIVER_CONFIG) private readonly config: DriverConfig,
    private readonly http: HttpService,
  ) {}

  async provisionDriver(phone: string): Promise<{ user_id: string }> {
    const res = await firstValueFrom(
      this.http.post<{ user_id: string }>(
        `${this.config.authBaseUrl}/v1/internal/users`,
        { phone, role: 'driver' },
        { timeout: 3000 },
      ),
    );
    return res.data;
  }
}
