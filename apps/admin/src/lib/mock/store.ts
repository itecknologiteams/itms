import {
  AuditLogEntry,
  Broadcast,
  Driver,
  DriverPerformanceRow,
  FareConfig,
  PaymentMixRow,
  RidesDailyRow,
  Vehicle,
  Violation,
  ViolationSummaryRow,
  Zone,
} from '@/types/api';

/**
 * Seeded, mutable in-memory data for MOCK_MODE (docs/ui-ux.md-driven demo).
 * Lets every page be clicked through and screenshotted without a live backend
 * (this sandbox has no Docker daemon — see the repo README). Not a test
 * double for the real API contract; shapes are kept in sync with
 * src/types/api.ts by hand.
 */
let idCounter = 1000;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function square(centerLat: number, centerLon: number, half: number): number[][][] {
  return [
    [
      [centerLon - half, centerLat - half],
      [centerLon + half, centerLat - half],
      [centerLon + half, centerLat + half],
      [centerLon - half, centerLat + half],
      [centerLon - half, centerLat - half],
    ],
  ];
}

export const zones: Zone[] = [
  {
    id: 'zone-clifton',
    name: 'Clifton',
    boundary: { type: 'Polygon', coordinates: square(24.8138, 67.0299, 0.012) },
    status: 'active',
    version: 2,
    createdAt: '2026-06-01T08:00:00Z',
    updatedAt: '2026-07-01T08:00:00Z',
  },
  {
    id: 'zone-defence',
    name: 'DHA Phase 5',
    boundary: { type: 'Polygon', coordinates: square(24.8007, 67.0654, 0.014) },
    status: 'active',
    version: 1,
    createdAt: '2026-06-01T08:00:00Z',
    updatedAt: '2026-06-01T08:00:00Z',
  },
  {
    id: 'zone-saddar',
    name: 'Saddar',
    boundary: { type: 'Polygon', coordinates: square(24.8546, 67.0207, 0.01) },
    status: 'active',
    version: 1,
    createdAt: '2026-06-05T08:00:00Z',
    updatedAt: '2026-06-05T08:00:00Z',
  },
  {
    id: 'zone-korangi',
    name: 'Korangi',
    boundary: { type: 'Polygon', coordinates: square(24.8339, 67.1201, 0.015) },
    status: 'inactive',
    version: 1,
    createdAt: '2026-06-10T08:00:00Z',
    updatedAt: '2026-06-10T08:00:00Z',
  },
];

export const vehicles: Vehicle[] = [
  { id: 'veh-1', plateNo: 'KHI-1042', model: 'BYD e2', year: 2025, color: 'White', trackerDeviceId: 'TRK-1042', status: 'active', createdAt: '2026-06-01T08:00:00Z' },
  { id: 'veh-2', plateNo: 'KHI-2091', model: 'MG4 EV', year: 2024, color: 'Blue', trackerDeviceId: 'TRK-2091', status: 'active', createdAt: '2026-06-02T08:00:00Z' },
  { id: 'veh-3', plateNo: 'KHI-3157', model: 'BYD e2', year: 2025, color: 'Silver', trackerDeviceId: 'TRK-3157', status: 'maintenance', createdAt: '2026-06-03T08:00:00Z' },
  { id: 'veh-4', plateNo: 'KHI-4488', model: 'Wuling Air EV', year: 2024, color: 'Red', trackerDeviceId: 'TRK-4488', status: 'active', createdAt: '2026-06-04T08:00:00Z' },
];

export const drivers: Driver[] = [
  { id: 'drv-1', name: 'Bilal Ahmed', phone: '+923001234567', cnic: '42101-1234567-1', licenseNo: 'KHI-LIC-001', licenseExpiry: '2027-01-15', status: 'approved', online: 'online', currentVehicleId: 'veh-1', ratingAvg: '4.80', createdAt: '2026-06-01T08:00:00Z' },
  { id: 'drv-2', name: 'Nasir Khan', phone: '+923001234568', cnic: '42101-1234567-2', licenseNo: 'KHI-LIC-002', licenseExpiry: '2026-08-01', status: 'approved', online: 'on_trip', currentVehicleId: 'veh-2', ratingAvg: '4.65', createdAt: '2026-06-02T08:00:00Z' },
  { id: 'drv-3', name: 'Zubair Malik', phone: '+923001234569', cnic: '42101-1234567-3', licenseNo: 'KHI-LIC-003', licenseExpiry: '2027-03-20', status: 'pending', online: 'offline', currentVehicleId: null, ratingAvg: '0.00', createdAt: '2026-07-01T08:00:00Z' },
  { id: 'drv-4', name: 'Farhan Sheikh', phone: '+923001234570', cnic: '42101-1234567-4', licenseNo: 'KHI-LIC-004', licenseExpiry: '2026-12-01', status: 'suspended', online: 'offline', currentVehicleId: 'veh-4', ratingAvg: '3.90', createdAt: '2026-06-04T08:00:00Z' },
];

export const violations: Violation[] = [
  { id: 'vio-1', vehicleId: 'veh-3', driverId: 'drv-4', zoneId: 'zone-korangi', status: 'open', openedAt: '2026-07-07T09:12:00Z', closedAt: null, maxDistanceM: 420, resolutionNote: null },
  { id: 'vio-2', vehicleId: 'veh-2', driverId: 'drv-2', zoneId: 'zone-defence', status: 'auto_closed', openedAt: '2026-07-06T14:00:00Z', closedAt: '2026-07-06T14:22:00Z', maxDistanceM: 180, resolutionNote: null },
  { id: 'vio-3', vehicleId: 'veh-4', driverId: 'drv-4', zoneId: 'zone-saddar', status: 'escalated', openedAt: '2026-07-05T11:00:00Z', closedAt: null, maxDistanceM: 950, resolutionNote: null },
];

export const fareConfigs: FareConfig[] = [
  { id: 'fc-1', version: 1, basePaisa: '10000', perKmPaisa: '5000', perMinPaisa: '200', minimumPaisa: '15000', rounding: 'nearest_10', nightMultiplier: null, effectiveFrom: '2026-07-01T00:00:00Z', createdBy: null },
];

export const ridesDaily: RidesDailyRow[] = Array.from({ length: 7 }).map((_, i) => ({
  date: `2026-07-0${i + 1}`,
  zoneId: 'zone-clifton',
  ridesCompleted: 40 + i * 6,
  ridesCancelled: 3 + (i % 3),
  noDriverCount: i % 2,
  revenuePaisa: String((40 + i * 6) * 32000),
  avgFarePaisa: 32000 + i * 400,
  avgMatchSeconds: 45 - i,
}));

export const driverPerformance: DriverPerformanceRow[] = drivers.map((d, i) => ({
  driverId: d.id,
  date: '2026-07-07',
  rides: 8 + i * 3,
  onlineHours: 6.5 + i,
  earningsPaisa: String((8 + i * 3) * 32000),
  ratingAvg: Number(d.ratingAvg),
  violations: i === 3 ? 2 : 0,
}));

export const violationSummary: ViolationSummaryRow[] = zones.map((z, i) => ({
  zoneId: z.id,
  date: '2026-07-07',
  opened: i + 1,
  autoClosed: i,
  escalated: i === 2 ? 1 : 0,
  avgDurationS: 300 + i * 60,
}));

export const paymentMix: PaymentMixRow[] = [
  { date: '2026-07-07', method: 'cash', count: 120, amountPaisa: '3840000' },
  { date: '2026-07-07', method: 'jazzcash', count: 85, amountPaisa: '2720000' },
  { date: '2026-07-07', method: 'card', count: 40, amountPaisa: '1280000' },
];

export const auditLog: AuditLogEntry[] = [
  { id: 'aud-1', adminId: 'admin-1', action: 'zone.update', entity: 'zone', entityId: 'zone-clifton', before: { status: 'inactive' }, after: { status: 'active' }, at: '2026-07-01T08:00:00Z' },
  { id: 'aud-2', adminId: 'admin-1', action: 'driver.suspend', entity: 'driver', entityId: 'drv-4', before: null, after: { reason: 'Escalated geofence violation' }, at: '2026-07-05T11:05:00Z' },
];

export const broadcasts: Broadcast[] = [
  { id: 'bc-1', audience: 'all_drivers', templateKey: 'driver_document_expiring', sentBy: 'admin-1', count: 42, at: '2026-07-02T09:00:00Z' },
];
