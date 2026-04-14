import { z } from 'zod';
import pino from 'pino';

const log = pino({ name: 'env-validator' });

const optionalUrl = z.string().url().optional().or(z.literal(''));

const envSchema = z.object({
  // Core
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:3001'),
  JWT_SECRET: z.string({
    required_error: 'FATAL: JWT_SECRET é obrigatório',
  }).min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres em produção'),
  
  // Strapi
  STRAPI_URL: z.string().url().default('http://localhost:1337'),
  STRAPI_API_TOKEN: z.string({
    required_error: 'FATAL: STRAPI_API_TOKEN é obrigatório',
  }).min(1, 'STRAPI_API_TOKEN não pode estar vazio'),
  
  // Upstash Redis
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  // OAuth
  OAUTH_REDIRECT_BASE_URL: z.string().url().default('http://localhost:5173'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: optionalUrl,
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_REDIRECT_URI: optionalUrl,
  
  // Services
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional().or(z.literal('')),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  
  // Media (Cloudflare R2)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: optionalUrl,
  
  // AI
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com'),
  DEEPSEEK_MODEL: z.string().default('deepseek-chat'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('llama3.2'),
  AI_PROVIDER: z.enum(['deepseek', 'ollama']).default('deepseek'),
  
  // LTI 1.3
  LTI_PRIVATE_KEY: z.string().optional(),
  LTI_PUBLIC_KEY: z.string().optional(),
  LTI_KEY_ID: z.string().default('pdc-lti-key-1'),
  
  // Monitoring
  SENTRY_DSN: optionalUrl,
  
  // Dev / Debug
  DEV_SKIP_OTP: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  SEO_BOT_RENDER_ENABLED: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
  TINA_RATE_LIMIT_PER_USER: z.coerce.number().default(20),
  TINA_RATE_LIMIT_GLOBAL: z.coerce.number().default(500),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors;
  console.error('❌ ERRO DE CONFIGURAÇÃO: Variáveis de ambiente inválidas ou ausentes:');
  Object.entries(errors).forEach(([field, messages]) => {
    console.error(`   - ${field}: ${messages?.join(', ')}`);
  });
  process.exit(1);
}

export const env = parsed.data;

// Validação extra para produção
if (env.NODE_ENV === 'production') {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    console.error('❌ ERRO DE CONFIGURAÇÃO (Produção): UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN são obrigatórios em produção.');
    process.exit(1);
  }
  if (env.DEV_SKIP_OTP) {
    console.error('❌ ERRO DE SEGURANÇA: DEV_SKIP_OTP não pode ser true em produção.');
    process.exit(1);
  }
} else {
  // Warning em dev se Redis ausente
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    log.warn('Redis não configurado. Funcionalidades de cache e rate limiting estarão limitadas.');
  }
}
