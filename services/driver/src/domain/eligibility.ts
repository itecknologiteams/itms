import { DriverStatus } from '../entities/driver.entity';

/**
 * Pure rules deciding whether a driver may go Online (docs/specs.md D-02, A-09).
 * No I/O — the service layer supplies the driver's current status, whether a
 * suspension is currently active, and license expiry.
 */
export interface EligibilityInput {
  driverStatus: DriverStatus;
  hasVehicle: boolean;
  isSuspended: boolean;
  licenseExpiry: Date | null;
  now: number;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: 'NOT_APPROVED' | 'NO_VEHICLE_ASSIGNED' | 'SUSPENDED' | 'LICENSE_EXPIRED';
}

export function canGoOnline(input: EligibilityInput): EligibilityResult {
  if (input.driverStatus !== DriverStatus.Approved) {
    return { eligible: false, reason: 'NOT_APPROVED' };
  }
  if (!input.hasVehicle) {
    return { eligible: false, reason: 'NO_VEHICLE_ASSIGNED' };
  }
  if (input.isSuspended) {
    return { eligible: false, reason: 'SUSPENDED' };
  }
  if (input.licenseExpiry && input.licenseExpiry.getTime() <= input.now) {
    return { eligible: false, reason: 'LICENSE_EXPIRED' };
  }
  return { eligible: true };
}

/** True when a license expires within the configured warning window (docs/specs.md notif matrix). */
export function isLicenseExpiringSoon(licenseExpiry: Date, now: number, warningDays: number): boolean {
  const warningMs = warningDays * 86_400_000;
  const msUntilExpiry = licenseExpiry.getTime() - now;
  return msUntilExpiry > 0 && msUntilExpiry <= warningMs;
}
