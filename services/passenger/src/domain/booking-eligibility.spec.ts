import { PassengerStatus } from '../entities/passenger.entity';
import { canBookRide } from './booking-eligibility';

describe('canBookRide', () => {
  it('allows an active passenger with no unsettled fare', () => {
    expect(canBookRide({ status: PassengerStatus.Active, unsettledRideId: null })).toEqual({
      allowed: true,
    });
  });

  it('blocks a blocked passenger regardless of unsettled state', () => {
    const r = canBookRide({ status: PassengerStatus.Blocked, unsettledRideId: null });
    expect(r).toEqual({ allowed: false, reason: 'BLOCKED' });
  });

  it('blocks booking while an unsettled fare exists', () => {
    const r = canBookRide({ status: PassengerStatus.Active, unsettledRideId: 'ride-1' });
    expect(r).toEqual({ allowed: false, reason: 'UNSETTLED_FARE' });
  });

  it('checks block status before unsettled fare (deterministic precedence)', () => {
    const r = canBookRide({ status: PassengerStatus.Blocked, unsettledRideId: 'ride-1' });
    expect(r.reason).toBe('BLOCKED');
  });
});
