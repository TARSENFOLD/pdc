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
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),

  // SMS (Twilio)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Sentry
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),

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

  // Dev
  DEV_SKIP_OTP: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const missing = err.issues.map((i) => i.path.join('.')).join(', ');
      log.error({ issues: err.issues }, `Variáveis de ambiente em falta ou inválidas: ${missing}`);
    }
    throw err;
  }
}

export const env = validateEnv();

if (env.NODE_ENV === 'production') {
  if (!env.SENTRY_DSN) log.warn('SENTRY_DSN ausente em produção.');
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER) {
    log.error('Credenciais Twilio ausentes em produção — OTP SMS não funcionará. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_PHONE_NUMBER no Railway.');
  }
} else {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    log.warn('Redis não configurado. Performance limitada.');
  } else {
    log.info('Redis (Upstash) integrado.');
  }
}
