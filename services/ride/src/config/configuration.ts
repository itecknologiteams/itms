export interface RideConfig {
  port: number;
  db: { host: string; port: number; username: string; password: string; database: string };
  rabbit: { url: string; exchange: string };
  jwt: { publicKey: string; issuer: string };
  dispatchBaseUrl: string;
  startProximityMeters: number;
  noShowMinutes: number;
  maxAutoRematch: number;
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

export function loadConfig(): RideConfig {
  return {
    port: Number(process.env.RIDE_SERVICE_PORT ?? 3007),
    db: {
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      username: required('POSTGRES_USER'),
      password: required('POSTGRES_PASSWORD'),
      database: process.env.RIDE_DB_NAME ?? 'ride_db',
    },
    rabbit: {
      url: process.env.RABBITMQ_URL ?? 'amqp://localhost:5672',
      exchange: process.env.RABBITMQ_EXCHANGE ?? 'itms.events',
    },
    jwt: {
      publicKey: readKey('JWT_PUBLIC_KEY_PATH', 'JWT_PUBLIC_KEY'),
      issuer: process.env.JWT_ISSUER ?? 'itms-auth',
    },
    dispatchBaseUrl: process.env.DISPATCH_BASE_URL ?? 'http://localhost:3004',
    startProximityMeters: Number(process.env.RIDE_START_PROXIMITY_M ?? 150),
    noShowMinutes: Number(process.env.RIDE_NO_SHOW_MIN ?? 5),
    maxAutoRematch: Number(process.env.RIDE_MAX_AUTO_REMATCH ?? 1),
  };
}

export const RIDE_CONFIG = Symbol('RIDE_CONFIG');
