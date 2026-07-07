export interface DocumentConfig {
  port: number;
  db: { host: string; port: number; username: string; password: string; database: string };
  rabbit: { url: string; exchange: string };
  jwt: { publicKey: string; issuer: string };
  s3: { endpoint: string; bucket: string; accessKey: string; secretKey: string };
  env: string;
  signedUrlTtlSeconds: number;
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

export function loadConfig(): DocumentConfig {
  return {
    port: Number(process.env.DOCUMENT_SERVICE_PORT ?? 3010),
    db: {
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      username: required('POSTGRES_USER'),
      password: required('POSTGRES_PASSWORD'),
      database: process.env.DOCUMENT_DB_NAME ?? 'document_db',
    },
    rabbit: {
      url: process.env.RABBITMQ_URL ?? 'amqp://localhost:5672',
      exchange: process.env.RABBITMQ_EXCHANGE ?? 'itms.events',
    },
    jwt: {
      publicKey: readKey('JWT_PUBLIC_KEY_PATH', 'JWT_PUBLIC_KEY'),
      issuer: process.env.JWT_ISSUER ?? 'itms-auth',
    },
    s3: {
      endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
      bucket: process.env.S3_BUCKET ?? 'itms-dev',
      accessKey: process.env.S3_ACCESS_KEY ?? 'itms_minio',
      secretKey: process.env.S3_SECRET_KEY ?? 'itms_minio_password',
    },
    env: process.env.NODE_ENV ?? 'development',
    signedUrlTtlSeconds: Number(process.env.SIGNED_URL_TTL_S ?? 300),
  };
}

export const DOCUMENT_CONFIG = Symbol('DOCUMENT_CONFIG');
