import { apiFetch } from '@/lib/api-client';
import { MOCK_MODE } from '@/lib/config';
import { delay } from '@/lib/mock/delay';
import { fareConfigs, nextId } from '@/lib/mock/store';
import { FareConfig } from '@/types/api';

export async function listFareConfigs(): Promise<FareConfig[]> {
  if (MOCK_MODE) {
    await delay();
    return [...fareConfigs].sort((a, b) => b.version - a.version);
  }
  return apiFetch<FareConfig[]>('/fare-configs');
}

export async function createFareConfig(input: {
  base_paisa: number;
  per_km_paisa: number;
  per_min_paisa: number;
  minimum_paisa: number;
  rounding?: 'nearest_10' | 'none';
  night_multiplier?: number;
}): Promise<FareConfig> {
  if (MOCK_MODE) {
    await delay();
    const version = Math.max(...fareConfigs.map((c) => c.version), 0) + 1;
    const config: FareConfig = {
      id: nextId('fc'),
      version,
      basePaisa: String(input.base_paisa),
      perKmPaisa: String(input.per_km_paisa),
      perMinPaisa: String(input.per_min_paisa),
      minimumPaisa: String(input.minimum_paisa),
      rounding: input.rounding ?? 'nearest_10',
      nightMultiplier: input.night_multiplier ? String(input.night_multiplier) : null,
      effectiveFrom: new Date().toISOString(),
      createdBy: null,
    };
    fareConfigs.push(config);
    return config;
  }
  return apiFetch<FareConfig>('/fare-configs', { method: 'POST', body: input });
}
