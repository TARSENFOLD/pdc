import { createHash, randomBytes } from 'node:crypto';
import { env } from '../../lib/env.js';
import { redis } from '../../lib/redis.js';
import { mailService } from '../mail/mail.service.js';
import { strapiGetRaw, strapiPutRaw } from '../strapi/strapi.client.js';
import { authSessionService } from './auth-session.service.js';
import { trustedDeviceService } from './trusted-device.service.js';
import pino from 'pino';

const RESET_TTL_SECONDS = 60 * 60;
const log = pino({ name: 'password-reset-service' });
const CLAIM_RESET_TOKEN_SCRIPT = `
local current = redis.call("GET", KEYS[1])
if not current or string.sub(current, 1, 8) == "claimed:" then return nil end
local ttl = redis.call("PTTL", KEYS[1])
if ttl <= 0 then return nil end
redis.call("SET", KEYS[1], "claimed:" .. ARGV[1] .. ":" .. current, "PX", ttl)
return current
`;
const RELEASE_RESET_TOKEN_SCRIPT = `
local current = redis.call("GET", KEYS[1])
if current ~= ARGV[1] then return 0 end
local ttl = redis.call("PTTL", KEYS[1])
if ttl <= 0 then redis.call("DEL", KEYS[1]); return 0 end
redis.call("SET", KEYS[1], ARGV[2], "PX", ttl)
return 1
`;
const FINALIZE_RESET_TOKEN_SCRIPT = `
if redis.call("GET", KEYS[1]) ~= ARGV[1] then return 0 end
redis.call("DEL", KEYS[1])
return 1
`;

interface StrapiUser {
  id: string | number;
  email: string;
  blocked?: boolean;
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

async function revokeUserAuthentication(userId: string, lockId: string): Promise<void> {
  const startedAt = Date.now();
  const revokedSessions = await authSessionService.revokeAll(userId, lockId);
  const revokedDevices = await trustedDeviceService.revokeAll(
    userId,
    () => authSessionService.renewGlobalRevocation(userId, lockId),
  );
  log.info(
    { durationMs: Date.now() - startedAt, revokedDevices, revokedSessions, userId },
    'Credenciais do utilizador revogadas durante reset',
  );
}

export const passwordResetService = {
  async request(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const users = await strapiGetRaw<StrapiUser[]>('/users', {
      'filters[email][$eq]': normalizedEmail,
      'pagination[pageSize]': '1',
    });
    const user = users[0];
    if (!user || user.blocked === true) return;

    const token = randomBytes(32).toString('base64url');
    const stored = await redis.set(tokenKey(token), String(user.id), { ex: RESET_TTL_SECONDS });
    if (stored !== 'OK') throw new Error('Falha ao persistir pedido de recuperação');

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
    const claimId = randomBytes(16).toString('base64url');
    const userId = await redis.eval<string | null>(
      CLAIM_RESET_TOKEN_SCRIPT,
      [key],
      [claimId],
    );
    if (!userId) return false;
    const claimedValue = `claimed:${claimId}:${userId}`;
    let resetLockId: string | undefined;
    let passwordUpdated = false;
    try {
      // ADR-054: fail-safe intencional. Uma falha posterior no Strapi pode exigir
      // novo login, mas nenhuma credencial antiga sobrevive a uma tentativa de reset.
      resetLockId = await authSessionService.beginGlobalRevocation(userId);
      await revokeUserAuthentication(userId, resetLockId);
      await strapiPutRaw(`/users/${userId}`, {
        password,
        confirmed: true,
      });
      passwordUpdated = true;
      try {
        await revokeUserAuthentication(userId, resetLockId);
      } catch (cleanupError) {
        log.error(
          { cleanupError, userId },
          'Limpeza posterior falhou; época global mantém credenciais anteriores inválidas',
        );
      }
      try {
        const finalized = await redis.eval<number>(
          FINALIZE_RESET_TOKEN_SCRIPT,
          [key],
          [claimedValue],
        );
        if (finalized !== 1) {
          log.warn({ userId }, 'Token de recuperação não finalizado após alteração da palavra-passe');
        }
      } catch (finalizeError) {
        log.error(
          { finalizeError, userId },
          'Erro ao finalizar token de recuperação após alteração da palavra-passe',
        );
      }
      return true;
    } catch (error) {
      if (!passwordUpdated) {
        try {
          await redis.eval<number>(
            RELEASE_RESET_TOKEN_SCRIPT,
            [key],
            [claimedValue, userId],
          );
        } catch (releaseError) {
          log.error({ releaseError, userId }, 'Falha ao libertar token de recuperação');
        }
      }
      throw error;
    } finally {
      if (resetLockId) {
        try {
          await authSessionService.endGlobalRevocation(userId, resetLockId);
        } catch (releaseError) {
          log.error({ releaseError, userId }, 'Falha ao libertar bloqueio global de autenticação');
        }
      }
    }
  },
};
