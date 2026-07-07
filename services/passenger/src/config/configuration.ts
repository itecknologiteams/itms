export interface PassengerConfig {
  port: number;
  db: { host: string; port: number; username: string; password: string; database: string };
  rabbit: { url: string; exchange: string };
  jwt: { publicKey: string; issuer: string };
  maxSavedMethods: number;
  authBaseUrl: string;
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

export function loadConfig(): PassengerConfig {
  return {
    port: Number(process.env.PASSENGER_SERVICE_PORT ?? 3002),
    db: {
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      username: required('POSTGRES_USER'),
      password: required('POSTGRES_PASSWORD'),
      database: process.env.PASSENGER_DB_NAME ?? 'passenger_db',
    },
    rabbit: {
      url: process.env.RABBITMQ_URL ?? 'amqp://localhost:5672',
      exchange: process.env.RABBITMQ_EXCHANGE ?? 'itms.events',
    },
    jwt: {
      publicKey: readKey('JWT_PUBLIC_KEY_PATH', 'JWT_PUBLIC_KEY'),
      issuer: process.env.JWT_ISSUER ?? 'itms-auth',
    },
    maxSavedMethods: Number(process.env.PASSENGER_MAX_SAVED_METHODS ?? 5),
    authBaseUrl: process.env.AUTH_BASE_URL ?? 'http://localhost:3001',
  };
}

export const PASSENGER_CONFIG = Symbol('PASSENGER_CONFIG');
