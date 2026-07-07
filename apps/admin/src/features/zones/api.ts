import { apiFetch } from '@/lib/api-client';
import { MOCK_MODE } from '@/lib/config';
import { delay } from '@/lib/mock/delay';
import { nextId, zones } from '@/lib/mock/store';
import { GeoJsonPolygon, Zone, ZoneStatus } from '@/types/api';

export async function listZones(): Promise<Zone[]> {
  if (MOCK_MODE) {
    await delay();
    return [...zones];
  }
  return apiFetch<Zone[]>('/zones');
}

export async function createZone(input: { name: string; boundary: GeoJsonPolygon }): Promise<Zone> {
  if (MOCK_MODE) {
    await delay();
    const zone: Zone = {
      id: nextId('zone'),
      name: input.name,
      boundary: input.boundary,
      status: 'active',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    zones.unshift(zone);
    return zone;
  }
  return apiFetch<Zone>('/zones', { method: 'POST', body: input });
}

export async function updateZoneStatus(id: string, status: ZoneStatus): Promise<Zone> {
  if (MOCK_MODE) {
    await delay();
    const zone = zones.find((z) => z.id === id);
    if (!zone) throw new Error('Zone not found');
    zone.status = status;
    zone.updatedAt = new Date().toISOString();
    return zone;
  }
  return apiFetch<Zone>(`/zones/${id}`, { method: 'PATCH', body: { status } });
}

export async function pairVehicle(vehicleId: string, zoneId: string): Promise<void> {
  if (MOCK_MODE) {
    await delay();
    return;
  }
  await apiFetch(`/zones/vehicles/${vehicleId}/pairing`, { method: 'PUT', body: { zone_id: zoneId } });
}
