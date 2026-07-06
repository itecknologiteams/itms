import { Params } from 'nestjs-pino';

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.otp',
  'req.body.code',
  'req.body.token',
  '*.password',
  '*.otp',
  '*.totp_secret',
];

/**
 * Structured JSON logging config shared by every service (docs/devops.md §4).
 * - Correlates logs by trace id.
 * - Redacts secrets and PII per docs/security.md §3 (no tokens, OTPs, passwords).
 * - Pretty prints in development only.
 */
export function loggerConfig(serviceName: string): Params {
  const isDev = process.env.NODE_ENV !== 'production';
  return {
    pinoHttp: {
      level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
      redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
      genReqId: (req, res) => {
        const existing = (req.headers['x-trace-id'] as string) || (req.id as string);
        const id = existing ?? cryptoRandomId();
        res.setHeader('x-trace-id', id);
        return id;
      },
      customProps: (req) => ({ service: serviceName, trace_id: (req as { id?: string }).id }),
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/ready' || req.url === '/metrics',
      },
      transport: isDev
        ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
        : undefined,
    },
  };
}

function cryptoRandomId(): string {
  // Lightweight, dependency-free correlation id. Not security-sensitive.
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  ).toUpperCase();
}
