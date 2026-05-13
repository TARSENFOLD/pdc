import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import type { Context, Next } from 'hono';
import { env } from "../lib/env.js";

export function initSentry() {
  if (!env.SENTRY_DSN) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    sendDefaultPii: false,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

export async function sentryUserContext(c: Context, next: Next) {
  const user = c.get('user') as { id: string } | undefined;
  if (user?.id) {
    Sentry.setUser({ id: user.id });
  }
  try {
    await next();
  } finally {
    if (user?.id) {
      Sentry.setUser(null);
    }
  }
}
