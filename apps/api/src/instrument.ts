import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

interface SanitizableRequest {
  cookies?: unknown;
  data?: unknown;
  query_string?: unknown;
  url?: unknown;
  headers?: Record<string, string>;
}

interface SanitizableEvent {
  request?: SanitizableRequest;
}

const SAFE_HEADERS = new Set(['accept', 'content-length', 'content-type', 'user-agent']);

function sanitizeEvent<T extends SanitizableEvent>(event: T): T {
  if (!event.request) return event;

  delete event.request.cookies;
  delete event.request.data;
  delete event.request.query_string;
  if (typeof event.request.url === 'string') {
    event.request.url = event.request.url.replace(/[?#].*$/u, '');
  }
  if (event.request.headers) {
    event.request.headers = Object.fromEntries(
      Object.entries(event.request.headers).filter(([header]) =>
        SAFE_HEADERS.has(header.toLowerCase())
      )
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
