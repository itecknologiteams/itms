export interface PaymentConfig {
  port: number;
  db: { host: string; port: number; username: string; password: string; database: string };
  rabbit: { url: string; exchange: string };
  jwt: { publicKey: string; issuer: string };
  policy: {
    maxDigitalRetries: number;
    cashFallbackMinutes: number;
    unsettledHours: number;
  };
  gateways: {
    /** 'stub' simulates gateway success/failure for dev/CI; 'sandbox'/'live' are
     * placeholders until real JazzCash/1LINK credentials arrive (OPEN-3). */
    mode: 'stub' | 'sandbox' | 'live';
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

export function loadConfig(): PaymentConfig {
  return {
    port: Number(process.env.PAYMENT_SERVICE_PORT ?? 3009),
    db: {
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      username: required('POSTGRES_USER'),
      password: required('POSTGRES_PASSWORD'),
      database: process.env.PAYMENT_DB_NAME ?? 'payment_db',
    },
    rabbit: {
      url: process.env.RABBITMQ_URL ?? 'amqp://localhost:5672',
      exchange: process.env.RABBITMQ_EXCHANGE ?? 'itms.events',
    },
    jwt: {
      publicKey: readKey('JWT_PUBLIC_KEY_PATH', 'JWT_PUBLIC_KEY'),
      issuer: process.env.JWT_ISSUER ?? 'itms-auth',
    },
    policy: {
      maxDigitalRetries: Number(process.env.PAYMENT_MAX_RETRIES ?? 3),
      cashFallbackMinutes: Number(process.env.PAYMENT_CASH_FALLBACK_MIN ?? 30),
      unsettledHours: Number(process.env.PAYMENT_UNSETTLED_HOURS ?? 24),
    },
    gateways: {
      mode: (process.env.PAYMENT_GATEWAY_MODE as PaymentConfig['gateways']['mode']) ?? 'stub',
    },
  };
}

export const PAYMENT_CONFIG = Symbol('PAYMENT_CONFIG');
