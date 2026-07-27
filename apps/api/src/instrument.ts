import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

interface SanitizableRequest {
  cookies?: unknown;
  data?: unknown;
  query_string?: unknown;
  headers?: Record<string, string>;
}

interface SanitizableEvent {
  request?: SanitizableRequest;
}

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'proxy-authorization',
  'set-cookie',
  'x-api-key',
]);

function sanitizeEvent<T extends SanitizableEvent>(event: T): T {
  if (!event.request) return event;

  delete event.request.cookies;
  delete event.request.data;
  delete event.request.query_string;
  if (event.request.headers) {
    event.request.headers = Object.fromEntries(
      Object.entries(event.request.headers).filter(
        ([header]) => !SENSITIVE_HEADERS.has(header.toLowerCase()),
      ),
    );
  }
  return event;
}

const dsn = process.env.SENTRY_DSN?.trim();

if (dsn) {
  const environment = process.env.NODE_ENV ?? 'development';
  const release = process.env.RELEASE_SHA?.trim();

  Sentry.init({
    dsn,
    environment,
    sendDefaultPii: false,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: environment === 'production' ? 0.1 : 1,
    profilesSampleRate: environment === 'production' ? 0.05 : 1,
    ...(release ? { release } : {}),
    beforeSend: sanitizeEvent,
    beforeSendTransaction: sanitizeEvent,
  });
}
