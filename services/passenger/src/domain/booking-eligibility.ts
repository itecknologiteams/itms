import { PassengerStatus } from '../entities/passenger.entity';

/**
 * Pure booking-eligibility rule (docs/specs.md §8.2: "Passenger cannot book a
 * new ride while owing an unsettled fare"; §A-05 block/unblock).
 */
export interface BookingEligibilityInput {
  status: PassengerStatus;
  unsettledRideId: string | null;
}

export interface BookingEligibilityResult {
  allowed: boolean;
  reason?: 'BLOCKED' | 'UNSETTLED_FARE';
}

export function canBookRide(input: BookingEligibilityInput): BookingEligibilityResult {
  if (input.status === PassengerStatus.Blocked) {
    return { allowed: false, reason: 'BLOCKED' };
  }
  if (input.unsettledRideId) {
    return { allowed: false, reason: 'UNSETTLED_FARE' };
  }
  return { allowed: true };
}
