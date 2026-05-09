import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

function restoreEnv(): void {
  process.env = { ...originalEnv };
}

function setBaseEnv(nodeEnv: 'development' | 'production' | 'test' = 'production'): void {
  process.env = {
    NODE_ENV: nodeEnv,
    PORT: '3001',
    API_URL: 'http://localhost:3001',
    FRONTEND_URL: 'http://localhost:5173',
    STRAPI_URL: 'http://localhost:1337',
    STRAPI_API_TOKEN: 'test-strapi-token',
    JWT_SECRET: 'test-jwt-secret-for-ci-minimum-32-chars',
  };
}

describe('env boot validation', () => {
  afterEach(() => {
    restoreEnv();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('falha em produção quando R2_PUBLIC_URL está ausente', async () => {
    setBaseEnv('production');
    process.env.R2_ACCOUNT_ID = 'account-id';
    process.env.R2_ACCESS_KEY_ID = 'access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'secret-key';
    process.env.SENDGRID_API_KEY = 'sendgrid-key';
    process.env.SENDGRID_FROM_EMAIL = 'no-reply@example.com';

    await expect(import('./env.js')).rejects.toThrow(/R2_PUBLIC_URL required in production/);
  });

  it('falha em produção quando nenhum provider de email está configurado', async () => {
    setBaseEnv('production');
    process.env.R2_ACCOUNT_ID = 'account-id';
    process.env.R2_ACCESS_KEY_ID = 'access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'secret-key';
    process.env.R2_PUBLIC_URL = 'https://media.example.com';

    await expect(import('./env.js')).rejects.toThrow(/SENDGRID_API_KEY or RESEND_API_KEY required in production/);
  });

  it('aceita produção quando R2 e um provider de email estão configurados', async () => {
    setBaseEnv('production');
    process.env.R2_ACCOUNT_ID = 'account-id';
    process.env.R2_ACCESS_KEY_ID = 'access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'secret-key';
    process.env.R2_PUBLIC_URL = 'https://media.example.com';
    process.env.RESEND_API_KEY = 'resend-key';

    const { validateEnv } = await import('./env.js');

    expect(validateEnv()).toMatchObject({
      NODE_ENV: 'production',
      R2_PUBLIC_URL: 'https://media.example.com',
      RESEND_API_KEY: 'resend-key',
    });
  });

  it('aceita desenvolvimento sem R2 nem provider de email', async () => {
    setBaseEnv('development');

    const { validateEnv } = await import('./env.js');

    expect(validateEnv()).toMatchObject({
      NODE_ENV: 'development',
    });
  });
});
