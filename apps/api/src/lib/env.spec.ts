import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

function restoreEnv(): void {
  for (const key in process.env) {
    if (!(key in originalEnv)) {
      Reflect.deleteProperty(process.env, key);
    }
  }
  for (const key in originalEnv) {
    process.env[key] = originalEnv[key];
  }
}

function setBaseEnv(nodeEnv: 'development' | 'production' | 'test' = 'production'): void {
  for (const key of [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_PUBLIC_URL',
    'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL',
    'RESEND_API_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'PDC_REDIS_URL',
    'DEEPSEEK_API_KEY',
    'WEB_PUSH_PUBLIC_KEY',
    'WEB_PUSH_PRIVATE_KEY',
    'WEB_PUSH_SUBJECT',
    'OTP_HASH_SECRET',
    'PDC_E2E_LONG_AUTH',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'LINKEDIN_CLIENT_ID',
    'LINKEDIN_CLIENT_SECRET',
    'LINKEDIN_REDIRECT_URI',
  ]) {
    Reflect.deleteProperty(process.env, key);
  }

  process.env.NODE_ENV = nodeEnv;
  process.env.PORT = '3001';
  process.env.API_URL = 'http://localhost:3001';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.STRAPI_URL = 'http://localhost:1337';
  process.env.STRAPI_API_TOKEN = 'test-strapi-token';
  process.env.JWT_SECRET = 'test-jwt-secret-for-ci-minimum-32-chars';
  process.env.OTP_HASH_SECRET = 'test-otp-hmac-secret-for-ci-minimum-32-chars';
}

function setRequiredProductionIntegrations(): void {
  process.env.R2_ACCOUNT_ID = 'account-id';
  process.env.R2_ACCESS_KEY_ID = 'access-key';
  process.env.R2_SECRET_ACCESS_KEY = 'secret-key';
  process.env.R2_PUBLIC_URL = 'https://media.example.com';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'redis-token';
  process.env.PDC_REDIS_URL = 'redis://pdc:test-password@redis:6379';
  process.env.DEEPSEEK_API_KEY = 'deepseek-key';
  process.env.RESEND_API_KEY = 'resend-key';
  process.env.WEB_PUSH_PUBLIC_KEY = 'web-push-public-key';
  process.env.WEB_PUSH_PRIVATE_KEY = 'web-push-private-key';
  process.env.WEB_PUSH_SUBJECT = 'mailto:ops@usepdc.com';
}

function setSendGridOnly(): void {
  process.env.SENDGRID_API_KEY = 'sendgrid-key';
  process.env.SENDGRID_FROM_EMAIL = 'no-reply@example.com';
  Reflect.deleteProperty(process.env, 'RESEND_API_KEY');
}

describe('env boot validation', () => {
  afterEach(() => {
    restoreEnv();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('falha em produção quando R2_PUBLIC_URL está ausente', async () => {
    setBaseEnv('production');
    setRequiredProductionIntegrations();
    Reflect.deleteProperty(process.env, 'R2_PUBLIC_URL');
    setSendGridOnly();

    await expect(import('./env.js')).rejects.toThrow(/R2_PUBLIC_URL required in production/);
  });

  it('falha em produção quando nenhum provider de email está configurado', async () => {
    setBaseEnv('production');
    setRequiredProductionIntegrations();
    Reflect.deleteProperty(process.env, 'RESEND_API_KEY');

    await expect(import('./env.js')).rejects.toThrow(/SENDGRID_API_KEY or RESEND_API_KEY required in production/);
  });

  it('falha em produção quando variável obrigatória ainda contém placeholder', async () => {
    setBaseEnv('production');
    setRequiredProductionIntegrations();
    process.env.STRAPI_API_TOKEN = '<your-strapi-api-token>';

    await expect(import('./env.js')).rejects.toThrow(/STRAPI_API_TOKEN required in production/);
  });

  it('falha em produção quando VAPID web-push não está configurado', async () => {
    setBaseEnv('production');
    setRequiredProductionIntegrations();
    Reflect.deleteProperty(process.env, 'WEB_PUSH_PRIVATE_KEY');

    await expect(import('./env.js')).rejects.toThrow(/WEB_PUSH_PRIVATE_KEY required in production/);
  });

  it('falha em produção quando DEV_SKIP_OTP está activo (security guard)', async () => {
    setBaseEnv('production');
    setRequiredProductionIntegrations();
    process.env.DEV_SKIP_OTP = 'true';

    await expect(import('./env.js')).rejects.toThrow(/DEV_SKIP_OTP must not be enabled in production/);
  });

  it('falha em produção quando PDC_E2E_LONG_AUTH está activo', async () => {
    setBaseEnv('production');
    setRequiredProductionIntegrations();
    process.env.PDC_E2E_LONG_AUTH = 'true';

    await expect(import('./env.js')).rejects.toThrow(/PDC_E2E_LONG_AUTH must not be enabled in production/);
  });

  it('falha em produção quando OTP_HASH_SECRET está ausente', async () => {
    setBaseEnv('production');
    setRequiredProductionIntegrations();
    Reflect.deleteProperty(process.env, 'OTP_HASH_SECRET');

    await expect(import('./env.js')).rejects.toThrow(/OTP_HASH_SECRET required in production/);
  });

  it('falha em produção quando OAuth está parcialmente configurado', async () => {
    setBaseEnv('production');
    setRequiredProductionIntegrations();
    process.env.GOOGLE_CLIENT_ID = 'google-client';

    await expect(import('./env.js')).rejects.toThrow(/GOOGLE_CLIENT_SECRET required/);
  });

  it('falha em produção quando apenas o callback OAuth está configurado', async () => {
    setBaseEnv('production');
    setRequiredProductionIntegrations();
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3001/auth/google/callback';

    await expect(import('./env.js')).rejects.toThrow(/GOOGLE_CLIENT_ID required/);
  });

  it('falha em produção quando o callback OAuth não pertence ao BFF', async () => {
    setBaseEnv('production');
    setRequiredProductionIntegrations();
    process.env.LINKEDIN_CLIENT_ID = 'linkedin-client';
    process.env.LINKEDIN_CLIENT_SECRET = 'linkedin-secret';
    process.env.LINKEDIN_REDIRECT_URI = 'https://usepdc.com/auth/linkedin/callback';

    await expect(import('./env.js')).rejects.toThrow(/LINKEDIN_REDIRECT_URI must use API_URL origin/);
  });

  it('falha em produção quando o Redis persistente do BFF está ausente', async () => {
    setBaseEnv('production');
    setRequiredProductionIntegrations();
    Reflect.deleteProperty(process.env, 'PDC_REDIS_URL');

    await expect(import('./env.js')).rejects.toThrow(/PDC_REDIS_URL required in production/);
  });

  it('falha quando PDC_REDIS_URL não contém hostname', async () => {
    setBaseEnv('production');
    setRequiredProductionIntegrations();
    process.env.PDC_REDIS_URL = 'redis://';

    await expect(import('./env.js')).rejects.toThrow(/PDC_REDIS_URL must be a valid Redis URL/);
  });

  it('falha em produção quando PDC_REDIS_URL não usa a identidade BFF restrita', async () => {
    setBaseEnv('production');
    setRequiredProductionIntegrations();
    process.env.PDC_REDIS_URL = 'redis://default:test-password@redis:6379';

    await expect(import('./env.js')).rejects.toThrow(/PDC_REDIS_URL must authenticate as pdc/);
  });

  it('falha em produção quando WEB_PUSH_SUBJECT não usa mailto: nem https:', async () => {
    setBaseEnv('production');
    setRequiredProductionIntegrations();
    process.env.WEB_PUSH_SUBJECT = 'ops@usepdc.com';

    await expect(import('./env.js')).rejects.toThrow(/WEB_PUSH_SUBJECT must start with mailto: or https:/);
  });

  it('aceita produção quando R2 e um provider de email estão configurados', async () => {
    setBaseEnv('production');
    setRequiredProductionIntegrations();

    const { validateEnv } = await import('./env.js');

    expect(validateEnv()).toMatchObject({
      NODE_ENV: 'production',
      R2_PUBLIC_URL: 'https://media.example.com',
      RESEND_API_KEY: 'resend-key',
      WEB_PUSH_SUBJECT: 'mailto:ops@usepdc.com',
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
