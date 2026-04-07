import { randomInt, createHash } from 'node:crypto';
import { redis } from '../../lib/redis.js';
import pino from 'pino';

const log = pino({ name: 'otp-service' });

export const otpService = {
  generateOtp(): string {
    return randomInt(100000, 999999).toString();
  },

  async storeOtp(userId: string, otp: string, canal: 'email' | 'sms'): Promise<void> {
    if (!redis) {
      throw new Error('OTP requer Redis (não configurado)');
    }
    const hash = createHash('sha256').update(otp).digest('hex');
    await redis.set(`otp:${userId}:${canal}`, hash, { ex: 600 });
  },

  async verifyOtp(userId: string, otp: string, canal: 'email' | 'sms'): Promise<boolean> {
    // 3 Camadas de Protecção para Dev
    const canSkip =
      process.env.NODE_ENV !== 'production' &&
      process.env.DEV_SKIP_OTP === 'true' &&
      !process.env.STRAPI_URL?.includes('pdc-strapi.railway.app');

    if (canSkip && otp === '000000') {
      log.warn({ userId }, 'OTP verification bypassed in dev mode with 000000');
      return true;
    }

    if (!redis) {
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

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY não configurada');
    }

    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
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

  async sendOtpSms(phone: string, otp: string): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !from) {
      throw new Error('Variáveis Twilio (SID, AUTH_TOKEN, PHONE_NUMBER) não configuradas');
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const body = new URLSearchParams({
      From: from,
      To: phone,
      Body: `Código PDC: ${otp}`,
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
      const error = await res.json().catch(() => ({}));
      log.error({ err: error }, 'Twilio error');
      throw new Error('Falha ao enviar SMS de OTP');
    }
  },
};
