import { DriverStatus } from '../entities/driver.entity';
import { canGoOnline, isLicenseExpiringSoon } from './eligibility';

const NOW = 1_700_000_000_000;
const base = {
  driverStatus: DriverStatus.Approved,
  hasVehicle: true,
  isSuspended: false,
  licenseExpiry: null as Date | null,
  now: NOW,
};

describe('canGoOnline', () => {
  it('allows an approved driver with a vehicle, no suspension, valid license', () => {
    expect(canGoOnline(base)).toEqual({ eligible: true });
  });

  it('blocks a driver not yet approved', () => {
    const r = canGoOnline({ ...base, driverStatus: DriverStatus.Pending });
    expect(r).toEqual({ eligible: false, reason: 'NOT_APPROVED' });
  });

  it('blocks a driver with no vehicle assigned', () => {
    const r = canGoOnline({ ...base, hasVehicle: false });
    expect(r).toEqual({ eligible: false, reason: 'NO_VEHICLE_ASSIGNED' });
  });

  it('blocks a suspended driver even if otherwise eligible', () => {
    const r = canGoOnline({ ...base, isSuspended: true });
    expect(r).toEqual({ eligible: false, reason: 'SUSPENDED' });
  });

  it('blocks a driver with an expired license', () => {
    const r = canGoOnline({ ...base, licenseExpiry: new Date(NOW - 1000) });
    expect(r).toEqual({ eligible: false, reason: 'LICENSE_EXPIRED' });
  });

  it('allows a driver whose license expires in the future', () => {
    const r = canGoOnline({ ...base, licenseExpiry: new Date(NOW + 86_400_000) });
    expect(r).toEqual({ eligible: true });
  });

  it('checks status before vehicle/suspension (deterministic precedence)', () => {
    const r = canGoOnline({ ...base, driverStatus: DriverStatus.Retired, hasVehicle: false, isSuspended: true });
    expect(r.reason).toBe('NOT_APPROVED');
  });
});

describe('isLicenseExpiringSoon', () => {
  it('is false when expiry is far away', () => {
    expect(isLicenseExpiringSoon(new Date(NOW + 30 * 86_400_000), NOW, 7)).toBe(false);
  });
  it('is true within the warning window', () => {
    expect(isLicenseExpiringSoon(new Date(NOW + 3 * 86_400_000), NOW, 7)).toBe(true);
  });
  it('is false once already expired (that is a different alert, not "expiring soon")', () => {
    expect(isLicenseExpiringSoon(new Date(NOW - 1000), NOW, 7)).toBe(false);
  });
});
