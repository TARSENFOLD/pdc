import { describe, expect, it, vi } from 'vitest';

vi.mock('./env.js', () => ({
  env: {
    NODE_ENV: 'production',
    FRONTEND_URL: 'http://localhost:5173',
  },
}));

import { applyCorsHeaders } from './cors.js';

function makeContext(origin: string | undefined) {
  const headers = new Map<string, string>();
  return {
    req: {
      header: (name: string) => (name.toLowerCase() === 'origin' ? origin : undefined),
    },
    header: (name: string, value: string) => {
      headers.set(name.toLowerCase(), value);
    },
    headers,
  } as const;
}

describe('applyCorsHeaders', () => {
  it('reflects allowed production origins on error responses', () => {
    const c = makeContext('https://usepdc.com');

    applyCorsHeaders(c as never);

    expect(c.headers.get('access-control-allow-origin')).toBe('https://usepdc.com');
    expect(c.headers.get('access-control-allow-credentials')).toBe('true');
    expect(c.headers.get('vary')).toBe('Origin');
  });

  it('does nothing for disallowed origins', () => {
    const c = makeContext('https://evil.example');

    applyCorsHeaders(c as never);

    expect(c.headers.size).toBe(0);
  });
});
