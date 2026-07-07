// Shared response shapes mirroring the backend DTOs/entities documented in
// docs/data-model.md and docs/api-design.md. Kept intentionally close to the
// wire format (snake_case where the backend uses it) to avoid a translation
// layer that could silently drift from the real contracts.

export type ZoneStatus = 'active' | 'inactive';

export interface LatLon {
  lat: number;
  lon: number;
}

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface Zone {
  id: string;
  name: string;
  boundary: GeoJsonPolygon;
  status: ZoneStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type VehicleStatus = 'active' | 'maintenance' | 'retired';

export interface Vehicle {
  id: string;
  plateNo: string;
  model: string;
  year: number | null;
  color: string | null;
  trackerDeviceId: string;
  status: VehicleStatus;
  createdAt: string;
}

export type DriverStatus = 'pending' | 'approved' | 'suspended' | 'retired';
export type OnlineStatus = 'offline' | 'online' | 'on_trip';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  cnic: string | null;
  licenseNo: string | null;
  licenseExpiry: string | null;
  status: DriverStatus;
  online: OnlineStatus;
  currentVehicleId: string | null;
  ratingAvg: string;
  createdAt: string;
}

export type ViolationStatus = 'open' | 'auto_closed' | 'acknowledged' | 'resolved' | 'escalated';

export interface Violation {
  id: string;
  vehicleId: string;
  driverId: string | null;
  zoneId: string;
  status: ViolationStatus;
  openedAt: string;
  closedAt: string | null;
  maxDistanceM: number;
  resolutionNote: string | null;
}

export interface FareConfig {
  id: string;
  version: number;
  basePaisa: string;
  perKmPaisa: string;
  perMinPaisa: string;
  minimumPaisa: string;
  rounding: 'nearest_10' | 'none';
  nightMultiplier: string | null;
  effectiveFrom: string;
  createdBy: string | null;
}

export interface RidesDailyRow {
  date: string;
  zoneId: string;
  ridesCompleted: number;
  ridesCancelled: number;
  noDriverCount: number;
  revenuePaisa: string;
  avgFarePaisa: number;
  avgMatchSeconds: number;
}

export interface DriverPerformanceRow {
  driverId: string;
  date: string;
  rides: number;
  onlineHours: number;
  earningsPaisa: string;
  ratingAvg: number;
  violations: number;
}

export interface ViolationSummaryRow {
  zoneId: string;
  date: string;
  opened: number;
  autoClosed: number;
  escalated: number;
  avgDurationS: number;
}

export interface PaymentMixRow {
  date: string;
  method: string;
  count: number;
  amountPaisa: string;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  entity: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  at: string;
}

export type BroadcastAudience = 'all_drivers' | 'all_passengers';

export interface Broadcast {
  id: string;
  audience: BroadcastAudience;
  templateKey: string;
  sentBy: string;
  count: number;
  at: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; trace_id: string; details?: Record<string, unknown> };
}
