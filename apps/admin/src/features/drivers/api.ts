import { apiFetch } from '@/lib/api-client';
import { MOCK_MODE } from '@/lib/config';
import { delay } from '@/lib/mock/delay';
import { drivers, nextId } from '@/lib/mock/store';
import { Driver, DriverStatus } from '@/types/api';

export async function listDrivers(status?: DriverStatus): Promise<Driver[]> {
  if (MOCK_MODE) {
    await delay();
    return status ? drivers.filter((d) => d.status === status) : [...drivers];
  }
  return apiFetch<Driver[]>(`/drivers${status ? `?status=${status}` : ''}`);
}

export async function onboardDriver(input: {
  phone: string;
  name: string;
  cnic?: string;
  license_no?: string;
  license_expiry?: string;
}): Promise<Driver> {
  if (MOCK_MODE) {
    await delay();
    const driver: Driver = {
      id: nextId('drv'),
      name: input.name,
      phone: input.phone,
      cnic: input.cnic ?? null,
      licenseNo: input.license_no ?? null,
      licenseExpiry: input.license_expiry ?? null,
      status: 'pending',
      online: 'offline',
      currentVehicleId: null,
      ratingAvg: '0.00',
      createdAt: new Date().toISOString(),
    };
    drivers.unshift(driver);
    return driver;
  }
  return apiFetch<Driver>('/drivers', { method: 'POST', body: input });
}

export async function approveDriver(id: string): Promise<Driver> {
  if (MOCK_MODE) {
    await delay();
    const d = drivers.find((x) => x.id === id);
    if (!d) throw new Error('Driver not found');
    d.status = 'approved';
    return d;
  }
  return apiFetch<Driver>(`/drivers/${id}/approve`, { method: 'POST' });
}

export async function assignVehicle(driverId: string, vehicleId: string): Promise<Driver> {
  if (MOCK_MODE) {
    await delay();
    const d = drivers.find((x) => x.id === driverId);
    if (!d) throw new Error('Driver not found');
    d.currentVehicleId = vehicleId;
    return d;
  }
  return apiFetch<Driver>(`/drivers/${driverId}/vehicle`, { method: 'POST', body: { vehicle_id: vehicleId } });
}

export async function suspendDriver(id: string, reason: string): Promise<Driver> {
  if (MOCK_MODE) {
    await delay();
    const d = drivers.find((x) => x.id === id);
    if (!d) throw new Error('Driver not found');
    d.status = 'suspended';
    d.online = 'offline';
    return d;
  }
  return apiFetch<Driver>(`/drivers/${id}/suspend`, { method: 'POST', body: { reason } });
}

export async function liftSuspension(id: string): Promise<Driver> {
  if (MOCK_MODE) {
    await delay();
    const d = drivers.find((x) => x.id === id);
    if (!d) throw new Error('Driver not found');
    d.status = 'approved';
    return d;
  }
  return apiFetch<Driver>(`/drivers/${id}/lift-suspension`, { method: 'POST' });
}
