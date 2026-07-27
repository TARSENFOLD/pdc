import { describe, expect, it } from 'vitest';
import type { Event } from '@sentry/react';
import { sanitizeSentryEvent } from './sentry';

describe('sanitizeSentryEvent', () => {
  it('remove conteúdo sensível e preserva headers operacionais', () => {
    const event: Event = {
      request: {
        cookies: { access_token: 'secret' },
        data: { otp: '123456' },
        query_string: 'code=oauth-code&state=csrf-state',
        headers: {
          Authorization: 'Bearer secret',
          Cookie: 'refresh_token=secret',
          Accept: 'application/json',
        },
      },
    };

    expect(sanitizeSentryEvent(event).request).toEqual({
      headers: { Accept: 'application/json' },
    });
  });
});
