import { decide, initialGeoState, VehicleGeoState } from './violation-decider';

const MARGIN = 75;
const DWELL = 120_000; // 120s
const T0 = 1_000_000;

function inside(state: VehicleGeoState, now = T0, authorized = false) {
  return decide({ distanceOutsideM: 0, now, marginM: MARGIN, dwellMs: DWELL, authorized, state });
}
function outside(dist: number, state: VehicleGeoState, now = T0, authorized = false) {
  return decide({
    distanceOutsideM: dist,
    now,
    marginM: MARGIN,
    dwellMs: DWELL,
    authorized,
    state,
  });
}

describe('violation decide (hysteresis)', () => {
  it('does nothing while inside the zone', () => {
    const r = inside(initialGeoState());
    expect(r.action.type).toBe('none');
    expect(r.state.pendingOutsideSince).toBeNull();
  });

  it('does not flag GPS drift within the margin', () => {
    const r = outside(50, initialGeoState()); // 50m < 75m margin
    expect(r.action.type).toBe('none');
    expect(r.state.pendingOutsideSince).toBeNull();
  });

  it('does not open before the dwell period elapses', () => {
    let s = initialGeoState();
    ({ state: s } = outside(200, s, T0));
    const r = outside(200, s, T0 + 60_000); // only 60s < 120s
    expect(r.action.type).toBe('none');
    expect(r.state.openViolationId).toBeNull();
  });

  it('opens a violation once dwell elapses beyond the margin', () => {
    let s = initialGeoState();
    ({ state: s } = outside(200, s, T0));
    const r = outside(240, s, T0 + DWELL);
    expect(r.action.type).toBe('open');
    if (r.action.type === 'open') expect(r.action.maxDistanceM).toBe(240);
    expect(r.state.openViolationId).toBe('PENDING');
  });

  it('auto-closes an open violation on re-entry', () => {
    const s: VehicleGeoState = {
      pendingOutsideSince: T0,
      maxDistanceM: 300,
      openViolationId: 'v1',
    };
    const r = inside(s, T0 + DWELL * 2);
    expect(r.action.type).toBe('close');
    expect(r.state.openViolationId).toBeNull();
  });

  it('never opens while authorized, and clears pending', () => {
    let s = initialGeoState();
    ({ state: s } = outside(500, s, T0));
    const r = outside(500, s, T0 + DWELL * 2, /* authorized */ true);
    expect(r.action.type).toBe('none');
    expect(r.state.pendingOutsideSince).toBeNull();
    expect(r.state.openViolationId).toBeNull();
  });

  it('tracks the worst distance during an ongoing excursion', () => {
    let s = initialGeoState();
    ({ state: s } = outside(100, s, T0));
    ({ state: s } = outside(400, s, T0 + 10_000));
    ({ state: s } = outside(250, s, T0 + 20_000));
    expect(s.maxDistanceM).toBe(400);
  });
});
