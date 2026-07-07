export interface FareConfig {
  port: number;
  db: { host: string; port: number; username: string; password: string; database: string };
  rabbit: { url: string; exchange: string };
  jwt: { publicKey: string; issuer: string };
  trackingBaseUrl: string;
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
  const fs = require('node:fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('node:path');
  const keyPath = required(pathVar);
  // `npm run -w <pkg>` changes cwd to the workspace dir, which would break a
  // default repo-root-relative key path for host-run commands (migrations,
  // start:dev, bootstrap scripts). INIT_CWD is npm's own record of where the
  // command was actually invoked from; Docker sets an absolute path, which
  // path.isAbsolute short-circuits, so this doesn't affect container runs.
  const base = process.env.INIT_CWD ?? process.cwd();
  const resolved = path.isAbsolute(keyPath) ? keyPath : path.resolve(base, keyPath);
  return fs.readFileSync(resolved, 'utf8');
}

export function loadConfig(): FareConfig {
  return {
    port: Number(process.env.FARE_SERVICE_PORT ?? 3008),
    db: {
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      username: required('POSTGRES_USER'),
      password: required('POSTGRES_PASSWORD'),
      database: process.env.FARE_DB_NAME ?? 'fare_db',
    },
    rabbit: {
      url: process.env.RABBITMQ_URL ?? 'amqp://localhost:5672',
      exchange: process.env.RABBITMQ_EXCHANGE ?? 'itms.events',
    },
    jwt: {
      publicKey: readKey('JWT_PUBLIC_KEY_PATH', 'JWT_PUBLIC_KEY'),
      issuer: process.env.JWT_ISSUER ?? 'itms-auth',
    },
    trackingBaseUrl: process.env.TRACKING_BASE_URL ?? 'http://localhost:3006',
  };
}

export const FARE_CONFIG = Symbol('FARE_CONFIG');
