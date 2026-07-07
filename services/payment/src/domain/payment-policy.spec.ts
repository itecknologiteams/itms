import { PaymentMethod } from '../entities/payment.entity';
import {
  canAttempt,
  nextStepAfterFailure,
  PolicyParams,
  shouldAutoFallbackToCash,
  shouldFlagUnsettled,
} from './payment-policy';
import { idempotencyKey, parseIdempotencyKey } from './idempotency';

const params: PolicyParams = { maxDigitalRetries: 3, cashFallbackMinutes: 30, unsettledHours: 24 };

describe('canAttempt', () => {
  it('always allows cash', () => {
    expect(canAttempt(PaymentMethod.Cash, 10, params).allowed).toBe(true);
  });

  it('allows digital attempts under the retry cap', () => {
    expect(canAttempt(PaymentMethod.JazzCash, 0, params).allowed).toBe(true);
    expect(canAttempt(PaymentMethod.JazzCash, 2, params).allowed).toBe(true);
  });

  it('blocks digital attempts once the cap is reached', () => {
    const r = canAttempt(PaymentMethod.Card, 3, params);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('MAX_RETRIES_EXCEEDED');
  });
});

describe('nextStepAfterFailure', () => {
  it('allows further digital retries below the cap', () => {
    expect(nextStepAfterFailure(1, params)).toBe('retry_digital');
    expect(nextStepAfterFailure(2, params)).toBe('retry_digital');
  });
  it('forces cash-only at the cap', () => {
    expect(nextStepAfterFailure(3, params)).toBe('cash_only');
  });
});

describe('shouldAutoFallbackToCash', () => {
  it('is false before the fallback window elapses', () => {
    expect(shouldAutoFallbackToCash(0, 29 * 60_000, params)).toBe(false);
  });
  it('is true once the fallback window elapses', () => {
    expect(shouldAutoFallbackToCash(0, 30 * 60_000, params)).toBe(true);
  });
});

describe('shouldFlagUnsettled', () => {
  it('is false before 24h, true after', () => {
    expect(shouldFlagUnsettled(0, 23 * 3_600_000, params)).toBe(false);
    expect(shouldFlagUnsettled(0, 24 * 3_600_000, params)).toBe(true);
  });
});

describe('idempotencyKey', () => {
  it('formats and parses round-trip', () => {
    const key = idempotencyKey('ride-123', 2);
    expect(key).toBe('pay:ride-123:2');
    expect(parseIdempotencyKey(key)).toEqual({ rideId: 'ride-123', attemptN: 2 });
  });

  it('returns null for a malformed key', () => {
    expect(parseIdempotencyKey('not-a-key')).toBeNull();
  });
});
