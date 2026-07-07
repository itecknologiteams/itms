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
  private loaded = false;

  constructor(
    @Inject(DISPATCH_CONFIG) private readonly config: DispatchConfig,
    private readonly http: HttpService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Docker-compose/Kubernetes give no ordering guarantee that Geofence is
    // already accepting connections when Dispatch boots (there's no explicit
    // startup dependency between them). Without a retry here, a single failed
    // fetch would leave the cache permanently empty — matching would silently
    // find zero zones for every ride until an unrelated zone edit happened to
    // fire a `zone.updated` event. Retry in the background instead of
    // blocking startup, so /health still comes up promptly.
    void this.refreshUntilLoaded();
  }

  private async refreshUntilLoaded(): Promise<void> {
    while (!this.loaded) {
      await this.refresh();
      if (!this.loaded) await new Promise((r) => setTimeout(r, 3000));
    }
  }

  async refresh(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<InternalZone[]>(`${this.config.geofenceBaseUrl}/v1/internal/zones`, {
          timeout: 3000,
        }),
      );
      this.zones = res.data.map((z) => ({ zoneId: z.zone_id, ring: z.ring }));
      this.loaded = true;
      this.logger.log(`Zone cache refreshed: ${this.zones.length} active zones`);
    } catch (err) {
      this.logger.error(`Zone cache refresh failed: ${(err as Error).message}`);
    }
  }

  all(): ZoneGeometry[] {
    return this.zones;
  }
}
