import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { FARE_CONFIG, FareConfig } from '../config/configuration';

/**
 * Fetches the GPS-trail distance for a ride from the Tracking service's internal
 * API (docs/architecture.md §3.1). Tracking finalizes the trail slice on the same
 * ride.ended event Fare consumes; a 404 here means Tracking hasn't finished yet,
 * which the caller treats as retryable (docs/architecture.md §3.2 at-least-once).
 */
@Injectable()
export class TrackingClient {
  constructor(
    @Inject(FARE_CONFIG) private readonly config: FareConfig,
    private readonly http: HttpService,
  ) {}

  async getTrailDistanceM(rideId: string): Promise<number | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ distance_m: number }>(
          `${this.config.trackingBaseUrl}/v1/internal/trails/${rideId}`,
          { timeout: 2000 },
        ),
      );
      return res.data.distance_m;
    } catch {
      return null; // not ready yet, or unavailable — caller decides how to handle
    }
  }
}
