import { apiFetch } from '@/lib/api-client';
import { MOCK_MODE } from '@/lib/config';
import { delay } from '@/lib/mock/delay';
import { nextId, vehicles } from '@/lib/mock/store';
import { Vehicle } from '@/types/api';

export async function listVehicles(): Promise<Vehicle[]> {
  if (MOCK_MODE) {
    await delay();
    return [...vehicles];
  }
  return apiFetch<Vehicle[]>('/vehicles');
}

export async function onboardVehicle(input: {
  plate_no: string;
  model: string;
  tracker_device_id: string;
  year?: number;
  color?: string;
}): Promise<Vehicle> {
  if (MOCK_MODE) {
    await delay();
    const vehicle: Vehicle = {
      id: nextId('veh'),
      plateNo: input.plate_no,
      model: input.model,
      year: input.year ?? null,
      color: input.color ?? null,
      trackerDeviceId: input.tracker_device_id,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    vehicles.unshift(vehicle);
    return vehicle;
  }
  return apiFetch<Vehicle>('/vehicles', { method: 'POST', body: input });
}
