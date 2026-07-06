import { ConflictError } from '@itms/common';
import {
  canTransition,
  isTerminal,
  RideAction,
  RideStatus,
  transition,
} from './ride-state-machine';

describe('ride state machine', () => {
  it('walks the happy path request → completed', () => {
    let s = RideStatus.Requested;
    s = transition(s, RideAction.StartMatching);
    expect(s).toBe(RideStatus.Matching);
    s = transition(s, RideAction.Assign);
    expect(s).toBe(RideStatus.Assigned);
    s = transition(s, RideAction.Arrive);
    expect(s).toBe(RideStatus.Arriving);
    s = transition(s, RideAction.Start);
    expect(s).toBe(RideStatus.InProgress);
    s = transition(s, RideAction.End);
    expect(s).toBe(RideStatus.PendingPayment);
    s = transition(s, RideAction.PaymentSuccess);
    expect(s).toBe(RideStatus.Completed);
    expect(isTerminal(s)).toBe(true);
  });

  it('routes exhausted matching to no_driver_found', () => {
    expect(transition(RideStatus.Matching, RideAction.Exhausted)).toBe(RideStatus.NoDriverFound);
  });

  it('supports payment failure then retry then success', () => {
    let s = transition(RideStatus.PendingPayment, RideAction.PaymentFailed);
    expect(s).toBe(RideStatus.PaymentFailed);
    s = transition(s, RideAction.RetryPayment);
    expect(s).toBe(RideStatus.PendingPayment);
    s = transition(s, RideAction.PaymentSuccess);
    expect(s).toBe(RideStatus.Completed);
  });

  it('allows no-show only from arriving', () => {
    expect(transition(RideStatus.Arriving, RideAction.NoShow)).toBe(RideStatus.CancelledNoShow);
    expect(canTransition(RideStatus.Assigned, RideAction.NoShow)).toBe(false);
  });

  it('rejects illegal transitions with a 409 ConflictError', () => {
    expect(() => transition(RideStatus.Completed, RideAction.Start)).toThrow(ConflictError);
    expect(() => transition(RideStatus.Requested, RideAction.End)).toThrow(ConflictError);
    expect(() => transition(RideStatus.InProgress, RideAction.PaymentSuccess)).toThrow(
      ConflictError,
    );
  });

  it('cannot start a ride before pickup arrival', () => {
    expect(canTransition(RideStatus.Assigned, RideAction.Start)).toBe(false);
    expect(canTransition(RideStatus.Arriving, RideAction.Start)).toBe(true);
  });

  it('marks all cancellation and no-driver states terminal', () => {
    expect(isTerminal(RideStatus.CancelledByPassenger)).toBe(true);
    expect(isTerminal(RideStatus.CancelledNoShow)).toBe(true);
    expect(isTerminal(RideStatus.NoDriverFound)).toBe(true);
    expect(isTerminal(RideStatus.Matching)).toBe(false);
  });
});
