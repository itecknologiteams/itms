/**
 * Pure hysteresis decision logic for geofence violations (docs/specs.md §6.3–6.4).
 * No I/O — fully unit-testable. The service layer supplies the distance (computed
 * from cached zone geometry), the current time, whether the movement is authorized,
 * and the vehicle's prior state; this returns the action to take and the next state.
 */

export interface VehicleGeoState {
  /** When the vehicle first went beyond the margin without re-entering; null if inside/near. */
  pendingOutsideSince: number | null;
  /** Max distance observed during the current excursion, metres. */
  maxDistanceM: number;
  /** Id of a currently open violation, if any. */
  openViolationId: string | null;
}

export const initialGeoState = (): VehicleGeoState => ({
  pendingOutsideSince: null,
  maxDistanceM: 0,
  openViolationId: null,
});

export interface DecideInput {
  distanceOutsideM: number; // 0 when inside the zone
  now: number; // epoch ms
  marginM: number;
  dwellMs: number;
  /** True if an active ride, return window, or movement pass authorizes being out of zone. */
  authorized: boolean;
  state: VehicleGeoState;
}

export type DecideAction =
  | { type: 'none' }
  | { type: 'open'; maxDistanceM: number }
  | { type: 'close' };

export interface DecideResult {
  action: DecideAction;
  state: VehicleGeoState;
}

/**
 * Decision table:
 *  - within margin  → close any open violation (auto), clear pending.
 *  - beyond margin & authorized → clear pending (never open); leave an existing
 *    open violation to be closed on re-entry.
 *  - beyond margin & unauthorized → start/continue dwell; open once dwell elapsed
 *    and none is open yet.
 */
export function decide(input: DecideInput): DecideResult {
  const { distanceOutsideM, now, marginM, dwellMs, authorized, state } = input;
  const outside = distanceOutsideM > marginM;

  if (!outside) {
    if (state.openViolationId) {
      return { action: { type: 'close' }, state: reset() };
    }
    return { action: { type: 'none' }, state: reset() };
  }

  // Beyond the margin.
  if (authorized) {
    // Authorized movement never opens a violation; pending is cleared. An already
    // open violation stays open until the vehicle re-enters its zone.
    return {
      action: { type: 'none' },
      state: { ...state, pendingOutsideSince: null },
    };
  }

  const maxDistanceM = Math.max(state.maxDistanceM, distanceOutsideM);

  if (state.openViolationId) {
    // Already flagged; just track the worst distance.
    return { action: { type: 'none' }, state: { ...state, maxDistanceM } };
  }

  const pendingSince = state.pendingOutsideSince ?? now;
  const dwellElapsed = now - pendingSince >= dwellMs;

  if (dwellElapsed) {
    return {
      action: { type: 'open', maxDistanceM },
      state: { pendingOutsideSince: pendingSince, maxDistanceM, openViolationId: 'PENDING' },
    };
  }

  return {
    action: { type: 'none' },
    state: { pendingOutsideSince: pendingSince, maxDistanceM, openViolationId: null },
  };
}

function reset(): VehicleGeoState {
  return initialGeoState();
}
