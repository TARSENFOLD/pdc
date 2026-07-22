import { z } from 'zod';
import pino from 'pino';

const log = pino({ name: 'env-validator' });

function isRedisUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'redis:' || url.protocol === 'rediss:') && url.hostname.length > 0;
  } catch {
    return false;
  }
}

function usesBffRedisIdentity(value: string): boolean {
  const url = new URL(value);
  return url.username === 'pdc' && url.password.length > 0;
}

const envSchema = z.object({
  // Core
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  API_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  
  // Strapi
  STRAPI_URL: z.string().url(),
  STRAPI_API_TOKEN: z.string().min(1),
  STRAPI_TIMEOUT: z.string().optional(),
  STRAPI_WRITE_TIMEOUT: z.string().optional(),
  JWT_SECRET: z.string().min(32),
  OTP_HASH_SECRET: z.string().min(32).optional(),
  
  // Redis
  PDC_REDIS_URL: z.string().refine(isRedisUrl, 'PDC_REDIS_URL must be a valid Redis URL').optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional().or(z.literal('')),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional().or(z.literal('')),

  // OAuth 2.0
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_REDIRECT_URI: z.string().url().optional(),
  OAUTH_REDIRECT_BASE_URL: z.string().url().default('http://localhost:5173'),

  // Database
  DATABASE_URL: z.string().url().optional(),

  // Mail
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),

  // SMS (Twilio)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Sentry
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  EDGE_PUBLIC_URL: z.string().url().optional().or(z.literal('')),

  // AI
  AI_PROVIDER: z.enum(['deepseek', 'openai', 'ollama']).default('deepseek'),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com'),
  DEEPSEEK_MODEL: z.string().default('deepseek-chat'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('llama3'),

  // R2 Storage
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default('pdc-media'),
  R2_PUBLIC_URL: z.string().url().optional().or(z.literal('')),

  // Web Push (VAPID)
  WEB_PUSH_PUBLIC_KEY: z.string().regex(/^[A-Za-z0-9_-]+$/, 'WEB_PUSH_PUBLIC_KEY must be base64url').optional().or(z.literal('')),
  WEB_PUSH_PRIVATE_KEY: z.string().regex(/^[A-Za-z0-9_-]+$/, 'WEB_PUSH_PRIVATE_KEY must be base64url').optional().or(z.literal('')),
  WEB_PUSH_SUBJECT: z.string().regex(/^(mailto:|https:)/, 'WEB_PUSH_SUBJECT must start with mailto: or https:').optional().or(z.literal('')),

  // SEO & Rates
  SEO_BOT_RENDER_ENABLED: z.string().default('true'),
  TINA_RATE_LIMIT_PER_USER: z.string().default('20'),
  TINA_RATE_LIMIT_GLOBAL: z.string().default('500'),
  RATE_LIMIT_PROFILE: z.enum(['strict', 'permissive', 'off']).default('strict'),

  // Dev
  DEV_SKIP_OTP: z.string().optional(),
  PDC_E2E_LONG_AUTH: z.enum(['true', 'false']).default('false'),

  // LTI (Learning Tools Interoperability)
  LTI_PRIVATE_KEY: z.string().optional(),
  LTI_PUBLIC_KEY: z.string().optional(),
  LTI_KEY_ID: z.string().default('pdc-lti-key-1'),

  // Internal account provisioning (CLI only)
  PDC_INTERNAL_ACCOUNT_EMAIL: z.string().email().optional(),
  PDC_INTERNAL_ACCOUNT_PASSWORD: z.string().min(12).optional(),
  PDC_INTERNAL_ACCOUNT_NAME: z.string().trim().min(3).optional(),
  PDC_INTERNAL_ACCOUNT_ROLE: z.enum(['super_admin', 'moderador', 'comite_cientifico']).optional(),
  PDC_INTERNAL_ACCOUNT_RESET_PASSWORD: z.enum(['true', 'false']).default('false'),
});

export type Env = z.infer<typeof envSchema>;

function isPlaceholder(value: string): boolean {
  return /^<[^>]+>$/.test(value.trim());
}

function hasValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !isPlaceholder(value);
}

function hasSameOrigin(left: string, right: string): boolean {
  return new URL(left).origin === new URL(right).origin;
}

function collectProductionMissingVars(parsedEnv: Env): string[] {
  const missing: string[] = [];

  const requiredInProduction: Array<[keyof Env, string]> = [
    ['API_URL', 'API_URL required in production'],
    ['FRONTEND_URL', 'FRONTEND_URL required in production'],
    ['STRAPI_URL', 'STRAPI_URL required in production'],
    ['STRAPI_API_TOKEN', 'STRAPI_API_TOKEN required in production'],
    ['JWT_SECRET', 'JWT_SECRET required in production'],
    ['OTP_HASH_SECRET', 'OTP_HASH_SECRET required in production'],
    ['PDC_REDIS_URL', 'PDC_REDIS_URL required in production'],
    ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_URL required in production'],
    ['UPSTASH_REDIS_REST_TOKEN', 'UPSTASH_REDIS_REST_TOKEN required in production'],
    ['R2_PUBLIC_URL', 'R2_PUBLIC_URL required in production'],
    ['R2_ACCOUNT_ID', 'R2_ACCOUNT_ID required in production'],
    ['R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY_ID required in production'],
    ['R2_SECRET_ACCESS_KEY', 'R2_SECRET_ACCESS_KEY required in production'],
    ['WEB_PUSH_PUBLIC_KEY', 'WEB_PUSH_PUBLIC_KEY required in production'],
    ['WEB_PUSH_PRIVATE_KEY', 'WEB_PUSH_PRIVATE_KEY required in production'],
    ['WEB_PUSH_SUBJECT', 'WEB_PUSH_SUBJECT required in production'],
  ];
  for (const [key, message] of requiredInProduction) {
    if (!hasValue(parsedEnv[key])) missing.push(message);
  }
  if (hasValue(parsedEnv.PDC_REDIS_URL) && !usesBffRedisIdentity(parsedEnv.PDC_REDIS_URL)) {
    missing.push('PDC_REDIS_URL must authenticate as pdc with a password in production');
  }
  if (parsedEnv.AI_PROVIDER === 'deepseek' && !hasValue(parsedEnv.DEEPSEEK_API_KEY)) {
    missing.push('DEEPSEEK_API_KEY required in production when AI_PROVIDER=deepseek');
  }

  const oauthProviders = [
    {
      name: 'GOOGLE',
      clientId: parsedEnv.GOOGLE_CLIENT_ID,
      clientSecret: parsedEnv.GOOGLE_CLIENT_SECRET,
      redirectUri: parsedEnv.GOOGLE_REDIRECT_URI,
    },
    {
      name: 'LINKEDIN',
      clientId: parsedEnv.LINKEDIN_CLIENT_ID,
      clientSecret: parsedEnv.LINKEDIN_CLIENT_SECRET,
      redirectUri: parsedEnv.LINKEDIN_REDIRECT_URI,
    },
  ];
  for (const provider of oauthProviders) {
    if (
      !hasValue(provider.clientId)
      && !hasValue(provider.clientSecret)
      && !hasValue(provider.redirectUri)
    ) continue;
    if (!hasValue(provider.clientId)) missing.push(`${provider.name}_CLIENT_ID required when OAuth provider is enabled`);
    if (!hasValue(provider.clientSecret)) missing.push(`${provider.name}_CLIENT_SECRET required when OAuth provider is enabled`);
    if (!hasValue(provider.redirectUri)) {
      missing.push(`${provider.name}_REDIRECT_URI required when OAuth provider is enabled`);
    } else if (!hasSameOrigin(provider.redirectUri, parsedEnv.API_URL)) {
      missing.push(`${provider.name}_REDIRECT_URI must use API_URL origin in production`);
    }
  }

  // Defense-in-depth (spec: Auth Fix): DEV_SKIP_OTP e proibido em producao.
  // O BFF recusa o boot se esta variavel estiver activa em NODE_ENV=production,
  // independentemente de o guard do auth.otp.ts a filtrar. Camada extra de seguranca.
  if (parsedEnv.DEV_SKIP_OTP === 'true') {
    missing.push('DEV_SKIP_OTP must not be enabled in production (security: OTP bypass disabled)');
  }
  if (parsedEnv.PDC_E2E_LONG_AUTH === 'true') {
    missing.push('PDC_E2E_LONG_AUTH must not be enabled in production');
  }

  const hasSendGrid = hasValue(parsedEnv.SENDGRID_API_KEY);
  const hasResend = hasValue(parsedEnv.RESEND_API_KEY);
  if (!hasSendGrid && !hasResend) {
    missing.push('SENDGRID_API_KEY or RESEND_API_KEY required in production');
  }
  if (hasSendGrid && !hasValue(parsedEnv.SENDGRID_FROM_EMAIL)) {
    missing.push('SENDGRID_FROM_EMAIL required in production when SENDGRID_API_KEY is set');
  }

  return missing;
}

function logRuntimeEnvStatus(parsedEnv: Env): void {
  if (parsedEnv.NODE_ENV === 'production') {
    const missing = collectProductionMissingVars(parsedEnv);
    if (missing.length > 0) {
      log.error({ missing }, 'Configuração de produção incompleta');
      throw new Error(`Configuração de produção incompleta: ${missing.join('; ')}`);
    }

    if (hasValue(parsedEnv.SENDGRID_API_KEY) && hasValue(parsedEnv.RESEND_API_KEY)) {
      log.warn(
        { providerUsedForOtp: 'sendgrid', providerUsedForTransactionalMail: 'resend' },
        'SENDGRID_API_KEY e RESEND_API_KEY configuradas; SendGrid será usado para OTP e Resend para email transacional.',
      );
    }

    if (!parsedEnv.SENTRY_DSN) log.warn('SENTRY_DSN ausente em produção.');
    if (!parsedEnv.TWILIO_ACCOUNT_SID || !parsedEnv.TWILIO_AUTH_TOKEN || !parsedEnv.TWILIO_PHONE_NUMBER) {
      log.warn('Credenciais Twilio ausentes em produção — OTP SMS não funcionará. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_PHONE_NUMBER no VPS Hetzner (ficheiro .env em /opt/pdc).');
    }
    return;
  }

  if (!parsedEnv.R2_PUBLIC_URL) {
    log.warn('R2_PUBLIC_URL ausente. Uploads R2 podem falhar fora de fluxos locais.');
  }

  if (!parsedEnv.SENDGRID_API_KEY && !parsedEnv.RESEND_API_KEY) {
    log.warn('Nenhum provider de email configurado. Emails não serão enviados.');
  }

  if (parsedEnv.PDC_REDIS_URL) {
    log.info('Redis TCP primário integrado.');
  } else {
    log.warn('Redis TCP primário não configurado. Capacidades de segurança permanecerão fail-closed.');
  }

  if (parsedEnv.UPSTASH_REDIS_REST_URL && parsedEnv.UPSTASH_REDIS_REST_TOKEN) {
    log.info('Redis (Upstash) integrado.');
  } else {
    log.warn('Redis Upstash não configurado. Telemetria e rate limiting distribuído ficarão indisponíveis ou degradados.');
  }
}

export function validateEnv(): Env {
  try {
    const parsedEnv = envSchema.parse(process.env);
    logRuntimeEnvStatus(parsedEnv);
    return parsedEnv;
  } catch (err) {
    if (err instanceof z.ZodError) {
      const missing = err.issues.map((i) => i.path.join('.')).join(', ');
      log.error({ issues: err.issues }, `Variáveis de ambiente em falta ou inválidas: ${missing}`);
    }
    throw err;
  }
}

export const env = validateEnv();
