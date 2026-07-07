/**
 * API routing (docs/architecture.md §1: single entry point via Kong).
 *
 * In staging/production, API_GATEWAY_URL points at Kong and every /v1/* path
 * is forwarded there — Kong does the per-service routing.
 *
 * In local dev without Kong running, we emulate its routing table here by
 * fanning each path prefix out to the individual service's port, matching
 * docs/api-design.md's endpoint catalog. This is a dev convenience only.
 */
const SERVICE_PORTS = {
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
  'admin-reporting': 3012,
};

// path prefix (after /v1/) -> owning service, per docs/api-design.md
const ROUTES = [
  ['auth', 'auth'],
  ['passengers', 'passenger'],
  ['drivers', 'driver'],
  ['vehicles', 'driver'],
  ['zones', 'geofence'],
  ['violations', 'geofence'],
  ['tracking', 'tracking'],
  ['rides', 'ride'],
  ['fare-configs', 'fare'],
  ['payments', 'payment'],
  ['documents', 'document'],
  ['notifications', 'notification'],
  ['admin', 'admin-reporting'],
];

function serviceUrl(service) {
  const envKey = `${service.toUpperCase().replace('-', '_')}_SERVICE_URL`;
  return process.env[envKey] ?? `http://localhost:${SERVICE_PORTS[service]}`;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const gateway = process.env.API_GATEWAY_URL;
    if (gateway) {
      return [{ source: '/api/v1/:path*', destination: `${gateway}/v1/:path*` }];
    }
    return ROUTES.map(([prefix, service]) => ({
      source: `/api/v1/${prefix}/:path*`,
      destination: `${serviceUrl(service)}/v1/${prefix}/:path*`,
    }));
  },
};

module.exports = nextConfig;
