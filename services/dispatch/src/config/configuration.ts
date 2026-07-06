export interface DispatchConfig {
  port: number;
  redisUrl: string;
  rabbit: { url: string; exchange: string };
  jwt: { publicKey: string; issuer: string };
  geofenceBaseUrl: string;
  matching: {
    initialZones: number;
    offerSeconds: number;
    maxZones: number;
    maxTotalWaitSeconds: number;
  };
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function readKey(pathVar: string, inlineVar: string): string {
  const inline = process.env[inlineVar];
  if (inline) return inline.replace(/\\n/g, '\n');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('node:fs').readFileSync(required(pathVar), 'utf8');
}

export function loadConfig(): DispatchConfig {
  return {
    port: Number(process.env.DISPATCH_SERVICE_PORT ?? 3004),
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    rabbit: {
      url: process.env.RABBITMQ_URL ?? 'amqp://localhost:5672',
      exchange: process.env.RABBITMQ_EXCHANGE ?? 'itms.events',
    },
    jwt: {
      publicKey: readKey('JWT_PUBLIC_KEY_PATH', 'JWT_PUBLIC_KEY'),
      issuer: process.env.JWT_ISSUER ?? 'itms-auth',
    },
    geofenceBaseUrl: process.env.GEOFENCE_BASE_URL ?? 'http://localhost:3005',
    matching: {
      initialZones: Number(process.env.DISPATCH_INITIAL_ZONES ?? 3),
      offerSeconds: Number(process.env.DISPATCH_OFFER_S ?? 15),
      maxZones: Number(process.env.DISPATCH_MAX_ZONES ?? 6),
      maxTotalWaitSeconds: Number(process.env.DISPATCH_MAX_TOTAL_WAIT_S ?? 90),
    },
  };
}

export const DISPATCH_CONFIG = Symbol('DISPATCH_CONFIG');
