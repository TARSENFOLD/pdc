import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { env } from "../lib/env.js";

export function initSentry() {
  if (!env.SENTRY_DSN) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    integrations: [
      nodeProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}
