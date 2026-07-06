import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { DISPATCH_CONFIG, DispatchConfig } from '../config/configuration';
import { ZoneGeometry } from '../domain/zone-selection';

interface InternalZone {
  zone_id: string;
  ring: { lat: number; lon: number }[];
}

/**
 * Caches active-zone geometry, loaded from the Geofence internal API at startup
 * and refreshed on `zone.updated`. Used to rank the nearest zones for a pickup.
 */
@Injectable()
export class ZoneCache implements OnModuleInit {
  private readonly logger = new Logger(ZoneCache.name);
  private zones: ZoneGeometry[] = [];

  constructor(
    @Inject(DISPATCH_CONFIG) private readonly config: DispatchConfig,
    private readonly http: HttpService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<InternalZone[]>(`${this.config.geofenceBaseUrl}/v1/internal/zones`, {
          timeout: 3000,
        }),
      );
      this.zones = res.data.map((z) => ({ zoneId: z.zone_id, ring: z.ring }));
      this.logger.log(`Zone cache refreshed: ${this.zones.length} active zones`);
    } catch (err) {
      this.logger.error(`Zone cache refresh failed: ${(err as Error).message}`);
    }
  }

  all(): ZoneGeometry[] {
    return this.zones;
  }
}
