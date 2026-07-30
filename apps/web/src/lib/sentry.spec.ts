import { describe, expect, it } from 'vitest';
import type { Event } from '@sentry/react';
import { sanitizeSentryEvent } from './sentry';

describe('sanitizeSentryEvent', () => {
  it('preserva eventos sem request sem inventar dados', () => {
    const event: Event = { message: 'Falha de arranque' };

    expect(sanitizeSentryEvent(event)).toBe(event);
    expect(event).toEqual({ message: 'Falha de arranque' });
  });

  it('remove conteúdo sensível e preserva headers operacionais', () => {
    const event: Event = {
      request: {
        cookies: { access_token: 'secret' },
        data: { otp: '123456' },
        query_string: 'code=oauth-code&state=csrf-state',
        url: 'https://usepdc.com/auth/linkedin/callback?code=oauth-code&state=csrf-state#done',
        headers: {
          Authorization: 'Bearer secret',
          Cookie: 'refresh_token=secret',
          Accept: 'application/json',
          Referer: 'https://accounts.google.com/o/oauth2/auth?code=oauth-code',
          'X-Forwarded-For': '203.0.113.42',
        },
      },
    };

    expect(sanitizeSentryEvent(event).request).toEqual({
      url: 'https://usepdc.com/auth/linkedin/callback',
      headers: { Accept: 'application/json' },
    });
  });
});
