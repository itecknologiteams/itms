#!/usr/bin/env node
// End-to-end smoke test: drives the real HTTP APIs across a running stack
// (docker-compose or the services started natively — ports are identical
// either way) through a full ride lifecycle. This is the test that proves
// the 12 services actually talk to each other correctly, not just that
// each one compiles/unit-tests in isolation. See README "Verifying it
// actually works".
//
// Usage:
//   npm run e2e:smoke
//
// Requires the stack to be up (npm run infra:up) and migrated
// (npm run migrate:all). Bootstraps its own admin account (idempotent —
// safe to re-run) rather than requiring one to already exist.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticator } from 'otplib';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

loadDotEnv(join(REPO_ROOT, '.env'));

const PORT = {
  auth: 3001,
  passenger: 3002,
  driver: 3003,
  dispatch: 3004,
  geofence: 3005,
  tracking: 3006,
  ride: 3007,
  fare: 3008,
  payment: 3009,
  document: 3010,
  notification: 3011,
  adminReporting: 3012,
};
const url = (svc, path) => `http://localhost:${PORT[svc]}/v1${path}`;

const ADMIN_EMAIL = process.env.ADMIN_BOOTSTRAP_EMAIL ?? 'admin@itms.example';
const ADMIN_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? 'change-me-please';

let step = 0;
function log(msg) {
  step += 1;
  console.log(`[${String(step).padStart(2, '0')}] ${msg}`);
}

async function main() {
  log('Waiting for all 12 services to report healthy...');
  await waitForAllHealthy();

  log(`Bootstrapping admin account (${ADMIN_EMAIL})...`);
  const { totpSecret } = bootstrapAdmin();

  log('Logging in as admin (email + password + TOTP)...');
  const adminToken = await adminLogin(ADMIN_EMAIL, ADMIN_PASSWORD, totpSecret);

  log('Publishing a fare config...');
  await api('POST', url('fare', '/fare-configs'), {
    token: adminToken,
    body: {
      base_paisa: 10000,
      per_km_paisa: 5000,
      per_min_paisa: 200,
      minimum_paisa: 15000,
      rounding: 'nearest_10',
    },
  });

  const rand = Math.floor(1000000000 + Math.random() * 8999999999).toString().slice(0, 10);
  const driverPhone = `+92${rand}`;
  const passengerRand = Math.floor(1000000000 + Math.random() * 8999999999).toString().slice(0, 10);
  const passengerPhone = `+92${passengerRand}`;
  const plateNo = `SMOKE-${Date.now().toString(36).toUpperCase()}`;

  log(`Onboarding driver ${driverPhone}...`);
  const driver = await api('POST', url('driver', '/drivers'), {
    token: adminToken,
    body: { phone: driverPhone, name: 'Smoke Test Driver' },
  });

  log(`Registering vehicle ${plateNo}...`);
  const vehicle = await api('POST', url('driver', '/vehicles'), {
    token: adminToken,
    body: {
      plate_no: plateNo,
      model: 'Smoke Test EV',
      tracker_device_id: `TRK-${Date.now()}`,
    },
  });

  log('Assigning vehicle to driver and approving driver...');
  await api('POST', url('driver', `/drivers/${driver.id}/vehicle`), {
    token: adminToken,
    body: { vehicle_id: vehicle.id },
  });
  await api('POST', url('driver', `/drivers/${driver.id}/approve`), { token: adminToken });

  const pickup = { lat: 24.8607, lon: 67.0011 };
  const dropoff = { lat: 24.8918, lon: 67.0298 };

  log('Creating a geofence zone covering the pickup/dropoff area...');
  const zone = await api('POST', url('geofence', '/zones'), {
    token: adminToken,
    body: {
      name: 'Smoke Test Zone',
      boundary: {
        type: 'Polygon',
        coordinates: [
          [
            [66.9, 24.75],
            [67.15, 24.75],
            [67.15, 24.95],
            [66.9, 24.95],
            [66.9, 24.75],
          ],
        ],
      },
    },
  });

  log('Pairing the vehicle to the zone...');
  await api('PUT', url('geofence', `/zones/vehicles/${vehicle.id}/pairing`), {
    token: adminToken,
    body: { zone_id: zone.id },
  });

  log('Logging in as the driver via OTP...');
  const driverToken = await otpLogin('driver', driverPhone, 'login');

  log('Driver going online...');
  await api('PATCH', url('driver', '/drivers/me/status'), {
    token: driverToken,
    body: { online: true },
  });

  log(`Registering + logging in as passenger ${passengerPhone} via OTP...`);
  const passengerToken = await otpLogin('passenger', passengerPhone, 'register');

  log('Passenger requesting a ride...');
  const requested = await api('POST', url('ride', '/rides'), {
    token: passengerToken,
    body: { pickup, dropoff },
  });
  const rideId = requested.id;
  log(`Ride ${rideId} created (status=${requested.status}).`);

  log('Driver accepting the ride (retrying until dispatch marks it eligible)...');
  await waitFor(
    async () => {
      try {
        await api('POST', url('ride', `/rides/${rideId}/accept`), { token: driverToken });
        return true;
      } catch (err) {
        if (err.status === 409) return false;
        throw err;
      }
    },
    { timeoutMs: 60_000, intervalMs: 2000, label: 'ride to be accepted' },
  );

  log('Driver marking arrival...');
  await api('POST', url('ride', `/rides/${rideId}/arrived`), { token: driverToken });

  log('Driver starting the ride...');
  await api('POST', url('ride', `/rides/${rideId}/start`), {
    token: driverToken,
    body: { position: pickup },
  });

  log('Driver ending the ride...');
  await api('POST', url('ride', `/rides/${rideId}/end`), { token: driverToken });

  log('Waiting for fare to be calculated...');
  const ridePriced = await waitFor(
    async () => {
      const r = await api('GET', url('ride', `/rides/${rideId}`), { token: passengerToken });
      return r.farePaisa != null ? r : null;
    },
    { timeoutMs: 20_000, intervalMs: 1000, label: 'fare calculation' },
  );
  log(`Fare calculated: ${ridePriced.farePaisa} paisa.`);

  log('Driver confirming cash payment received...');
  await api('POST', url('payment', `/payments/rides/${rideId}/cash-received`), { token: driverToken });

  log('Waiting for ride to complete...');
  await waitFor(
    async () => {
      const r = await api('GET', url('ride', `/rides/${rideId}`), { token: passengerToken });
      return r.status === 'completed' ? r : null;
    },
    { timeoutMs: 20_000, intervalMs: 1000, label: 'ride completion' },
  );

  log('Checking the payment receipt...');
  const receipt = await api('GET', url('payment', `/payments/rides/${rideId}/receipt`), {
    token: passengerToken,
  });
  log(`Receipt: ${receipt.amount_paisa} paisa via ${receipt.method}.`);

  log('Confirming the ride shows up in admin reporting...');
  const today = new Date().toISOString().slice(0, 10);
  // Admin-Reporting's projection consumes `ride.completed` on its own queue,
  // asynchronously from the payment/receipt calls above — same
  // eventual-consistency reasoning as every other post-event check in this
  // script, so this needs the same retry treatment.
  const totalCompleted = await waitFor(
    async () => {
      const report = await api(
        'GET',
        url('adminReporting', `/admin/reports/rides_daily?from=${today}&to=${today}`),
        { token: adminToken },
      );
      const total = report.reduce((sum, row) => sum + (row.ridesCompleted ?? 0), 0);
      return total >= 1 ? total : null;
    },
    { timeoutMs: 10_000, intervalMs: 1000, label: 'admin reporting projection' },
  );
  log(`Admin reporting shows ${totalCompleted} completed ride(s) today.`);

  console.log('\n✅ Smoke test passed: full ride → fare → payment → reporting flow works end-to-end.\n');
}

async function waitForAllHealthy() {
  await waitFor(
    async () => {
      const results = await Promise.all(
        Object.keys(PORT).map(async (svc) => {
          try {
            const res = await fetch(url(svc, '/health'));
            return res.ok;
          } catch {
            return false;
          }
        }),
      );
      return results.every(Boolean) ? true : null;
    },
    { timeoutMs: 90_000, intervalMs: 2000, label: 'all services healthy' },
  );
}

function bootstrapAdmin() {
  const jsonOut = join(tmpdir(), 'itms-smoke-admin-bootstrap.json');
  execFileSync('npm', ['run', '-w', '@itms/auth-service', 'bootstrap:admin'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ADMIN_BOOTSTRAP_EMAIL: ADMIN_EMAIL,
      ADMIN_BOOTSTRAP_PASSWORD: ADMIN_PASSWORD,
      ADMIN_BOOTSTRAP_JSON_OUT: jsonOut,
    },
    stdio: 'inherit',
  });
  return JSON.parse(readFileSync(jsonOut, 'utf8'));
}

async function adminLogin(email, password, totpSecret) {
  const { challenge } = await api('POST', url('auth', '/auth/admin/login'), {
    body: { email, password },
  });
  const code = authenticator.generate(totpSecret);
  // Confusingly named: `challenge_id` is the full challenge JWT returned
  // above by /admin/login, not a UUID (docs/api-design.md doesn't cover
  // this endpoint yet — filed as a naming nit, not fixed here).
  const { access } = await api('POST', url('auth', '/auth/admin/totp'), {
    body: { challenge_id: challenge, code },
  });
  return access;
}

async function otpLogin(service, phone, purpose) {
  await api('POST', url('auth', '/auth/otp/request'), { body: { phone, purpose } });
  const { code } = await api('GET', url('auth', `/internal/otp/${encodeURIComponent(phone)}`));
  const { access } = await api('POST', url('auth', '/auth/otp/verify'), {
    body: { phone, code, purpose },
  });
  return access;
}

async function api(method, target, { token, body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(target, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(`${method} ${target} -> ${res.status}: ${JSON.stringify(data)}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

async function waitFor(fn, { timeoutMs, intervalMs, label }) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (err) {
      lastErr = err;
    }
    await sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for ${label}` + (lastErr ? `: ${lastErr.message}` : ''));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

main().catch((err) => {
  console.error(`\n❌ Smoke test failed at step ${step}: ${err.message}\n`);
  process.exitCode = 1;
});
