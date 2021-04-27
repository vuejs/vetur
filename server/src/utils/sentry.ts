import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

export function startSentry() {
  Sentry.init({
    dsn: 'https://9f98a5b017574d5caa20c78835f9e606@o557134.ingest.sentry.io/5689013',

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,

    attachStacktrace: true
  });
}
