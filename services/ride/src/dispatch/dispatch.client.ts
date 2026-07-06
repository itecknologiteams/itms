import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { RIDE_CONFIG, RideConfig } from '../config/configuration';

export interface ClaimResult {
  won: boolean;
  vehicleId?: string;
  zoneId?: string;
}

/**
 * Thin client for the Dispatch service's internal claim API (docs/architecture.md
 * §3.4). The atomic first-accept-wins claim lives in Dispatch (Redis); Ride calls
 * it synchronously when a driver taps Accept, then transitions on a win.
 */
@Injectable()
export class DispatchClient {
  private readonly logger = new Logger(DispatchClient.name);

  constructor(
    @Inject(RIDE_CONFIG) private readonly config: RideConfig,
    private readonly http: HttpService,
  ) {}

  async claim(rideId: string, driverId: string): Promise<ClaimResult> {
    try {
      const res = await firstValueFrom(
        this.http.post<ClaimResult>(
          `${this.config.dispatchBaseUrl}/v1/internal/claim`,
          { ride_id: rideId, driver_id: driverId },
          { timeout: 2000 },
        ),
      );
      return res.data;
    } catch (err) {
      this.logger.error(`Dispatch claim failed for ride ${rideId}: ${(err as Error).message}`);
      // Fail closed: if we cannot confirm the claim, treat it as lost so two
      // drivers are never both assigned.
      return { won: false };
    }
  }
}
