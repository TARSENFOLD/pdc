import { createHash, randomBytes } from 'node:crypto';
import { env } from '../../lib/env.js';
import { redis } from '../../lib/redis.js';
import { mailService } from '../mail/mail.service.js';
import { strapiGetRaw, strapiPutRaw } from '../strapi/strapi.client.js';

const RESET_TTL_SECONDS = 60 * 60;

interface StrapiUser {
  id: string | number;
  email: string;
}

function tokenKey(token: string): string {
  return `password_reset:${createHash('sha256').update(token).digest('hex')}`;
}

function resetEmailHtml(resetUrl: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#12304a">
      <h1 style="font-size:24px">Redefinir palavra-passe</h1>
      <p>Recebemos um pedido para alterar a palavra-passe da tua conta PDC.</p>
      <p style="margin:32px 0">
        <a href="${resetUrl}" style="background:#c45f3c;color:#fff;padding:14px 20px;border-radius:8px;text-decoration:none;font-weight:700">
          Criar nova palavra-passe
        </a>
      </p>
      <p>Este link expira em 1 hora e só pode ser usado uma vez.</p>
      <p>Se não fizeste este pedido, ignora este email.</p>
    </div>
  `;
}

export const passwordResetService = {
  async request(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const users = await strapiGetRaw<StrapiUser[]>('/users', {
      'filters[email][$eq]': normalizedEmail,
      'pagination[pageSize]': '1',
    });
    const user = users[0];
    if (!user) return;

    const token = randomBytes(32).toString('base64url');
    await redis.set(tokenKey(token), String(user.id), { ex: RESET_TTL_SECONDS });

    const resetUrl = new URL('/reset-password', env.FRONTEND_URL);
    resetUrl.searchParams.set('token', token);

    await mailService.sendEmail({
      to: user.email,
      subject: 'Redefinir palavra-passe | PDC',
      html: resetEmailHtml(resetUrl.toString()),
    });
  },

  async reset(token: string, password: string): Promise<boolean> {
    const key = tokenKey(token);
    const userId = await redis.get<string>(key);
    if (!userId) return false;

    await strapiPutRaw(`/users/${userId}`, {
      password,
      confirmed: true,
      blocked: false,
    });
    await redis.del(key);
    return true;
  },
};
