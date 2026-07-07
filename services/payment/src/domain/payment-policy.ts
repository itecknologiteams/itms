import { PaymentMethod } from '../entities/payment.entity';

/**
 * Pure payment retry/fallback rules (docs/specs.md §8.2). No I/O — the service
 * layer supplies counts and elapsed time; this decides what's allowed next.
 */
export interface PolicyParams {
  maxDigitalRetries: number;
  cashFallbackMinutes: number;
  unsettledHours: number;
}

/** Cash is never retried digitally — the driver just re-confirms. */
export function canAttempt(
  method: PaymentMethod,
  priorAttempts: number,
  params: PolicyParams,
): { allowed: boolean; reason?: string } {
  if (method === PaymentMethod.Cash) return { allowed: true };
  if (priorAttempts >= params.maxDigitalRetries) {
    return { allowed: false, reason: 'MAX_RETRIES_EXCEEDED' };
  }
  return { allowed: true };
}

/**
 * After a digital failure, decide whether the passenger may still retry the
 * same/another digital method, or must be pushed to cash (docs/specs.md §8.2:
 * "max 3 digital retries, then cash-only").
 */
export function nextStepAfterFailure(
  priorAttempts: number,
  params: PolicyParams,
): 'retry_digital' | 'cash_only' {
  return priorAttempts >= params.maxDigitalRetries ? 'cash_only' : 'retry_digital';
}

/** True once a pending digital payment has sat long enough to auto-fallback to cash. */
export function shouldAutoFallbackToCash(pendingSinceMs: number, nowMs: number, params: PolicyParams): boolean {
  return nowMs - pendingSinceMs >= params.cashFallbackMinutes * 60_000;
}

/** True once an unpaid ride has sat long enough to flag as unsettled for admin action. */
export function shouldFlagUnsettled(pendingSinceMs: number, nowMs: number, params: PolicyParams): boolean {
  return nowMs - pendingSinceMs >= params.unsettledHours * 3_600_000;
}
