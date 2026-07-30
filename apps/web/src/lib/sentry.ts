import * as Sentry from '@sentry/react';
import type { Event } from '@sentry/react';

const SAFE_HEADERS = new Set(['accept', 'content-length', 'content-type', 'user-agent']);

export function sanitizeSentryEvent<EventType extends Event>(event: EventType): EventType {
  if (!event.request) return event;

  delete event.request.cookies;
  delete event.request.data;
  delete event.request.query_string;
  if (event.request.url) {
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

export function initWebSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION ?? '0.0.0',
    sendDefaultPii: false,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1,
    tracePropagationTargets: [
      /^https:\/\/api\.usepdc\.com(?:\/|$)/,
      /^http:\/\/localhost:3001(?:\/|$)/,
    ],
    beforeSend: sanitizeSentryEvent,
    beforeSendTransaction: sanitizeSentryEvent,
  });
}
