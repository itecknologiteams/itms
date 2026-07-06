import { ConflictError } from '@itms/common';

/** Ride lifecycle states (docs/specs.md §3). */
export enum RideStatus {
  Requested = 'requested',
  Matching = 'matching',
  Assigned = 'assigned',
  Arriving = 'arriving',
  InProgress = 'in_progress',
  PendingPayment = 'pending_payment',
  PaymentFailed = 'payment_failed',
  Completed = 'completed',
  CancelledByPassenger = 'cancelled_by_passenger',
  CancelledByDriver = 'cancelled_by_driver',
  CancelledNoShow = 'cancelled_no_show',
  NoDriverFound = 'no_driver_found',
}

/** Events that drive transitions. */
export enum RideAction {
  StartMatching = 'start_matching',
  Assign = 'assign',
  Exhausted = 'exhausted',
  Arrive = 'arrive',
  Start = 'start',
  End = 'end',
  PaymentSuccess = 'payment_success',
  PaymentFailed = 'payment_failed',
  RetryPayment = 'retry_payment',
  PassengerCancel = 'passenger_cancel',
  DriverCancel = 'driver_cancel',
  NoShow = 'no_show',
}

const TRANSITIONS: Record<RideStatus, Partial<Record<RideAction, RideStatus>>> = {
  [RideStatus.Requested]: {
    [RideAction.StartMatching]: RideStatus.Matching,
    [RideAction.PassengerCancel]: RideStatus.CancelledByPassenger,
  },
  [RideStatus.Matching]: {
    [RideAction.Assign]: RideStatus.Assigned,
    [RideAction.Exhausted]: RideStatus.NoDriverFound,
    [RideAction.PassengerCancel]: RideStatus.CancelledByPassenger,
  },
  [RideStatus.Assigned]: {
    [RideAction.Arrive]: RideStatus.Arriving,
    [RideAction.PassengerCancel]: RideStatus.CancelledByPassenger,
    // Driver cancel re-opens matching; the orchestrator caps automatic re-matches.
    [RideAction.DriverCancel]: RideStatus.Matching,
  },
  [RideStatus.Arriving]: {
    [RideAction.Start]: RideStatus.InProgress,
    [RideAction.NoShow]: RideStatus.CancelledNoShow,
    [RideAction.PassengerCancel]: RideStatus.CancelledByPassenger,
    [RideAction.DriverCancel]: RideStatus.Matching,
  },
  [RideStatus.InProgress]: {
    [RideAction.End]: RideStatus.PendingPayment,
  },
  [RideStatus.PendingPayment]: {
    [RideAction.PaymentSuccess]: RideStatus.Completed,
    [RideAction.PaymentFailed]: RideStatus.PaymentFailed,
  },
  [RideStatus.PaymentFailed]: {
    [RideAction.RetryPayment]: RideStatus.PendingPayment,
    [RideAction.PaymentSuccess]: RideStatus.Completed,
  },
  [RideStatus.Completed]: {},
  [RideStatus.CancelledByPassenger]: {},
  [RideStatus.CancelledByDriver]: {},
  [RideStatus.CancelledNoShow]: {},
  [RideStatus.NoDriverFound]: {},
};

export const TERMINAL_STATES: ReadonlySet<RideStatus> = new Set([
  RideStatus.Completed,
  RideStatus.CancelledByPassenger,
  RideStatus.CancelledByDriver,
  RideStatus.CancelledNoShow,
  RideStatus.NoDriverFound,
]);

export function isTerminal(status: RideStatus): boolean {
  return TERMINAL_STATES.has(status);
}

export function canTransition(from: RideStatus, action: RideAction): boolean {
  return TRANSITIONS[from]?.[action] !== undefined;
}

/**
 * Compute the next state or throw a 409 with a stable code. Pure — the service
 * layer persists the result and emits the corresponding domain event.
 */
export function transition(from: RideStatus, action: RideAction): RideStatus {
  const next = TRANSITIONS[from]?.[action];
  if (next === undefined) {
    throw new ConflictError(
      'ILLEGAL_RIDE_TRANSITION',
      `Cannot ${action} a ride in state ${from}`,
      { from, action },
    );
  }
  return next;
}
