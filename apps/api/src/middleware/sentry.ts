import * as Sentry from '@sentry/node';
import type { Context, Next } from 'hono';

export async function sentryUserContext(_c: Context, next: Next): Promise<void> {
  await Sentry.withIsolationScope(async () => {
    await next();
  });
}

export function setSentryUser(userId: string): void {
  Sentry.setUser({ id: userId });
}
