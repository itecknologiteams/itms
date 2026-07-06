import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@itms/auth';
import { ZoneRegistry } from './zone-registry.service';

/**
 * Internal zone geometry feed for the Dispatch service's zone cache
 * (docs/api-design.md §5). Network-locked, never routed through Kong.
 */
@ApiExcludeController()
@Controller({ path: 'internal', version: '1' })
export class InternalZonesController {
  constructor(private readonly registry: ZoneRegistry) {}

  @Public()
  @Get('zones')
  zones() {
    return this.registry.listActiveZones().map((z) => ({ zone_id: z.zoneId, ring: z.ring }));
  }
}
