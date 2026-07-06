export interface TrackingConfig {
  port: number;
  db: { host: string; port: number; username: string; password: string; database: string };
  rabbit: { url: string; exchange: string };
  redisUrl: string;
  mqtt: { url: string; topicPrefix: string; topicIsVehicleId: boolean };
  jwt: { publicKey: string; issuer: string };
  sampling: { publishIntervalSeconds: number };
  health: { staleSeconds: number; deadSeconds: number };
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

export function loadConfig(): TrackingConfig {
  return {
    port: Number(process.env.TRACKING_SERVICE_PORT ?? 3006),
    db: {
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      username: required('POSTGRES_USER'),
      password: required('POSTGRES_PASSWORD'),
      database: process.env.TRACKING_DB_NAME ?? 'tracking_db',
    },
    rabbit: {
      url: process.env.RABBITMQ_URL ?? 'amqp://localhost:5672',
      exchange: process.env.RABBITMQ_EXCHANGE ?? 'itms.events',
    },
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    mqtt: {
      url: process.env.MQTT_URL ?? 'mqtt://localhost:1883',
      topicPrefix: process.env.MQTT_TOPIC_PREFIX ?? 'tracker',
      // Dev convenience: treat the topic id as the vehicle id (no device mapping needed).
      topicIsVehicleId: process.env.TRACKER_TOPIC_IS_VEHICLE_ID === 'true',
    },
    jwt: {
      publicKey: readKey('JWT_PUBLIC_KEY_PATH', 'JWT_PUBLIC_KEY'),
      issuer: process.env.JWT_ISSUER ?? 'itms-auth',
    },
    sampling: { publishIntervalSeconds: Number(process.env.LOCATION_PUBLISH_INTERVAL_S ?? 30) },
    health: {
      staleSeconds: Number(process.env.TRACKER_STALE_S ?? 60),
      deadSeconds: Number(process.env.TRACKER_DEAD_S ?? 600),
    },
  };
}

export const TRACKING_CONFIG = Symbol('TRACKING_CONFIG');
