import { randomInt, createHash } from 'node:crypto';
import { redis, hasRedis } from '../../lib/redis.js';
import pino from 'pino';
import { env } from '../../lib/env.js';

const log = pino({ name: 'otp-service' });

function maskPhone(phone: string): string {
  if (!phone) return 'unknown';
  if (phone.length < 8) return '***';
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
}

function redactTwilioError(error: unknown): Record<string, unknown> {
  if (typeof error !== 'object' || error === null) {
    return {};
  }

  const safeError: Record<string, unknown> = { ...error };
  delete safeError.to;
  delete safeError.To;
  delete safeError.from;
  delete safeError.From;
  return safeError;
}

export const otpService = {
  generateOtp(): string {
    return randomInt(100000, 999999).toString();
  },

  async storeOtp(userId: string, otp: string, canal: 'email' | 'sms'): Promise<void> {
    if (!hasRedis) {
      throw new Error('OTP requer Redis (não configurado)');
    }
    const hash = createHash('sha256').update(otp).digest('hex');
    await redis.set(`otp:${userId}:${canal}`, hash, { ex: 600 });
  },

  async verifyOtp(userId: string, otp: string, canal: 'email' | 'sms'): Promise<boolean> {
    if (!hasRedis) {
      throw new Error('OTP requer Redis (não configurado)');
    }
    const key = `otp:${userId}:${canal}`;
    const storedHash = await redis.get<string>(key);
    if (!storedHash) return false;

    const hash = createHash('sha256').update(otp).digest('hex');
    if (hash === storedHash) {
      await redis.del(key);
      return true;
    }
    return false;
  },

  async deleteOtp(userId: string, canal: 'email' | 'sms'): Promise<void> {
    if (!hasRedis) {
      throw new Error('OTP requer Redis (não configurado)');
    }
    await redis.del(`otp:${userId}:${canal}`);
  },

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    const apiKey = env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY não configurada');
    }

    const fromEmail = env.SENDGRID_FROM_EMAIL;
    if (!fromEmail) {
      throw new Error('SENDGRID_FROM_EMAIL não configurada');
    }

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: fromEmail, name: 'PDC' },
        subject: 'Código de verificação PDC',
        content: [
          {
            type: 'text/plain',
            value: `O seu código de verificação PDC é: ${otp}. Válido por 10 minutos.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      log.error({ err: error }, 'SendGrid error');
      throw new Error('Falha ao enviar email de OTP');
    }
  },

  validateE164(phone: string): boolean {
    return /^\+[1-9]\d{1,14}$/.test(phone);
  },

  async checkSmsRateLimit(phone: string): Promise<void> {
    if (!hasRedis) {
      throw new Error('Serviço de SMS temporariamente indisponível (Redis OFF)');
    }
    const key = `otp:sms:ratelimit:${phone}`;
    // Atomic INCR + EXPIRE (600s = 10min per doc intent)
    const results = await redis.multi().incr(key).expire(key, 600).exec();
    
    // @upstash/redis devolve [result1, result2]
    // ioredis devolve [[err, result1], [err, result2]]
    const firstResult = results[0];
    const count = Array.isArray(firstResult) ? (firstResult[1] as number) : (firstResult);

    if (count > 3) {
      throw Object.assign(new Error('Limite de SMS excedido. Tenta novamente em 10 minutos.'), { status: 429 });
    }
  },

  async sendOtpSms(phone: string, otp: string): Promise<void> {
    if (!this.validateE164(phone)) {
      throw Object.assign(new Error('Número de telefone inválido. Use o formato E.164 (ex: +244923456789).'), { status: 400 });
    }

    await this.checkSmsRateLimit(phone);

    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;
    const from = env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !from) {
      throw new Error('Variáveis Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) não configuradas');
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const body = new URLSearchParams({
      From: from,
      To: phone,
      Body: `O teu código PDC é: ${otp}. Válido por 10 minutos. Não partilhes este código.`,
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${auth}`,
        },
        body: body.toString(),
      },
    );

    if (!res.ok) {
      const error: unknown = await res.json().catch((): Record<string, unknown> => ({}));
      // Sanitização de PII no erro da Twilio
      const safeError = redactTwilioError(error);
      log.error({ err: safeError, phone: maskPhone(phone) }, 'Twilio error');
      throw new Error('Falha ao enviar SMS de OTP via Twilio');
    }

    log.info({ phone: maskPhone(phone) }, 'OTP SMS enviado via Twilio');
  },
};
