import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

/** Typed configuration for the Auth service, loaded once at bootstrap. */
export interface AuthConfig {
  port: number;
  db: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  rabbit: { url: string; exchange: string };
  jwt: {
    privateKey: string;
    publicKey: string;
    accessTtl: string;
    refreshTtl: string;
    issuer: string;
  };
  otp: {
    length: number;
    ttlSeconds: number;
    maxAttempts: number;
    rateWindowSeconds: number;
    devEcho: boolean;
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function readKey(pathVar: string, inlineVar: string): string {
  // Allow either a PEM file path (dev) or the raw PEM in an env var (prod/secret manager).
  const inline = process.env[inlineVar];
  if (inline) return inline.replace(/\\n/g, '\n');
  const keyPath = required(pathVar);
  // `npm run -w <pkg>` changes cwd to the workspace dir, which would break a
  // default repo-root-relative key path for host-run commands (migrations,
  // start:dev, bootstrap scripts). INIT_CWD is npm's own record of where the
  // command was actually invoked from; Docker sets an absolute path, which
  // isAbsolute short-circuits, so this doesn't affect container runs.
  const base = process.env.INIT_CWD ?? process.cwd();
  const resolved = isAbsolute(keyPath) ? keyPath : resolve(base, keyPath);
  return readFileSync(resolved, 'utf8');
}

export function loadConfig(): AuthConfig {
  return {
    port: Number(process.env.AUTH_SERVICE_PORT ?? 3001),
    db: {
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      username: required('POSTGRES_USER'),
      password: required('POSTGRES_PASSWORD'),
      database: process.env.AUTH_DB_NAME ?? 'auth_db',
    },
    rabbit: {
      url: process.env.RABBITMQ_URL ?? 'amqp://localhost:5672',
      exchange: process.env.RABBITMQ_EXCHANGE ?? 'itms.events',
    },
    jwt: {
      privateKey: readKey('JWT_PRIVATE_KEY_PATH', 'JWT_PRIVATE_KEY'),
      publicKey: readKey('JWT_PUBLIC_KEY_PATH', 'JWT_PUBLIC_KEY'),
      accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
      refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
      issuer: process.env.JWT_ISSUER ?? 'itms-auth',
    },
    otp: {
      length: Number(process.env.OTP_LENGTH ?? 6),
      ttlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 180),
      maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
      rateWindowSeconds: Number(process.env.OTP_RATE_WINDOW_SECONDS ?? 1800),
      devEcho: process.env.OTP_DEV_ECHO === 'true',
    },
  };
}

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');
