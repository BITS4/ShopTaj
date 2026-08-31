import 'dotenv/config';
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN?.trim();

if (dsn) {
  const configuredSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.05');
  const tracesSampleRate = Number.isFinite(configuredSampleRate)
    ? Math.min(1, Math.max(0, configuredSampleRate))
    : 0.05;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    sendDefaultPii: false,
    tracesSampleRate,
  });
}
