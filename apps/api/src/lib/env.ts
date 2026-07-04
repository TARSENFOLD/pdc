import { z } from 'zod';
import pino from 'pino';

const log = pino({ name: 'env-validator' });

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
  
  // Redis
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

  // SEO & Rates
  SEO_BOT_RENDER_ENABLED: z.string().default('true'),
  TINA_RATE_LIMIT_PER_USER: z.string().default('20'),
  TINA_RATE_LIMIT_GLOBAL: z.string().default('500'),
  RATE_LIMIT_PROFILE: z.enum(['strict', 'permissive', 'off']).default('strict'),

  // Dev
  DEV_SKIP_OTP: z.string().optional(),

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

function hasValue(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function collectProductionMissingVars(parsedEnv: Env): string[] {
  const missing: string[] = [];

  if (!hasValue(parsedEnv.R2_PUBLIC_URL)) missing.push('R2_PUBLIC_URL required in production');
  if (!hasValue(parsedEnv.R2_ACCOUNT_ID)) missing.push('R2_ACCOUNT_ID required in production');
  if (!hasValue(parsedEnv.R2_ACCESS_KEY_ID)) missing.push('R2_ACCESS_KEY_ID required in production');
  if (!hasValue(parsedEnv.R2_SECRET_ACCESS_KEY)) missing.push('R2_SECRET_ACCESS_KEY required in production');

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
      log.warn('Credenciais Twilio ausentes em produção — OTP SMS não funcionará. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_PHONE_NUMBER no Railway.');
    }
    return;
  }

  if (!parsedEnv.R2_PUBLIC_URL) {
    log.warn('R2_PUBLIC_URL ausente. Uploads R2 podem falhar fora de fluxos locais.');
  }

  if (!parsedEnv.SENDGRID_API_KEY && !parsedEnv.RESEND_API_KEY) {
    log.warn('Nenhum provider de email configurado. Emails não serão enviados.');
  }

  if (!parsedEnv.UPSTASH_REDIS_REST_URL || !parsedEnv.UPSTASH_REDIS_REST_TOKEN) {
    log.warn('Redis não configurado. Performance limitada.');
  } else {
    log.info('Redis (Upstash) integrado.');
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
