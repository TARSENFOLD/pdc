import { SignJWT, jwtVerify } from 'jose';
import { redis } from '../../lib/redis.js';
import { env } from '../../lib/env.js';
import {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_TTL,
} from './auth.constants.js';
import { createHash, randomUUID } from 'node:crypto';
import { ConsentStateSchema, resolveEstadoMenoridade, type User, type Role } from '@pdc/shared';
import { strapiDelete, strapiDeleteRaw, strapiGetRaw, strapiPostRaw, strapiGet, strapiPost, strapiPut } from '../strapi/strapi.client.js';
import { getReputacao, getTier } from '../reputation/reputation.service.js';
import { resolvePerfilAvatar } from '../perfil/perfil-media.js';
import { buildPerfilComplianceFields, type RegistrationComplianceInput } from './auth.compliance.js';
import { consentService } from '../consent/consent.service.js';
import {
  resolveRole,
  type StrapiPerfilData,
  type StrapiUser,
  type StrapiUsersPermissionsRolesResponse,
} from './auth.strapi-types.js';
import { z } from 'zod';
import pino from 'pino';

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const log = pino({ name: 'auth-service' });

const RefreshPayloadSchema = z.object({
  sub: z.string().min(1),
});

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function getAuthenticatedRoleId(): Promise<number | string> {
  const roles = await strapiGetRaw<StrapiUsersPermissionsRolesResponse>('/users-permissions/roles');
  const authenticatedRole = roles.roles.find((role) => role.type === 'authenticated');
  if (!authenticatedRole) {
    throw new Error('Strapi Authenticated role not found');
  }
  return authenticatedRole.id;
}

export const authService = {
  async generateTokens(user: User) {
    const claims: Record<string, unknown> = { sub: user.id, role: user.role };
    if (user.perfilId) claims.perfilId = user.perfilId;
    if (user.onboardingCompleto != null) claims.onboardingCompleto = user.onboardingCompleto;
    if (user.estadoMenoridade != null) claims.estadoMenoridade = user.estadoMenoridade;
    if (user.consentimentoEstado != null) claims.consentimentoEstado = user.consentimentoEstado;
    if (user.isMinor != null) claims.isMinor = user.isMinor;
    const accessToken = await new SignJWT(claims)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_TTL)
      .sign(JWT_SECRET);
    const refreshToken = await new SignJWT({ sub: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(REFRESH_TOKEN_TTL)
      .setJti(randomUUID())
      .sign(JWT_SECRET);
    return { accessToken, refreshToken };
  },

  async saveRefreshToken(userId: string, token: string) {
    const hash = hashToken(token);
    await redis.set(`refresh_token:${userId}:${hash}`, 'true', {
      ex: REFRESH_TOKEN_MAX_AGE_SECONDS,
    });
  },

  async revokeRefreshToken(userId: string, token: string) {
    const hash = hashToken(token);
    await redis.del(`refresh_token:${userId}:${hash}`);
  },

  async verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const payloadResult = RefreshPayloadSchema.safeParse(payload);
      if (!payloadResult.success) return null;
      const userId = payloadResult.data.sub;
      const hash = hashToken(token);
      const exists = await redis.get(`refresh_token:${userId}:${hash}`);
      return exists ? { userId } : null;
    } catch {
      return null;
    }
  },

  async login(email: string, password: string): Promise<User> {
    const normalizedEmail = email.toLowerCase().trim();
    const data = await strapiPostRaw<{ user: StrapiUser }>('/auth/local', {
      identifier: normalizedEmail,
      password,
    });
    return this.getUserById(data.user.id.toString());
  },

  async register(
    email: string,
    password: string,
    nome: string,
    compliance: RegistrationComplianceInput,
  ): Promise<User> {
    return this.registerWithRole(email, password, nome, 'estudante', {}, compliance);
  },

  async registerWithRole(
    email: string,
    password: string,
    nome: string,
    role: Role,
    extra: Record<string, unknown>,
    compliance?: RegistrationComplianceInput,
  ): Promise<User> {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUsers = await strapiGetRaw<StrapiUser[]>('/users', {
      'filters[email][$eq]': normalizedEmail,
      'pagination[pageSize]': '1',
    });
    if (existingUsers[0]) {
      throw Object.assign(new Error('Já existe uma conta com este email. Inicia sessão ou usa recuperação de palavra-passe.'), { status: 409 });
    }

    let userId: string | undefined;
    try {
      const data = await strapiPostRaw<{ user: StrapiUser }>('/auth/local/register', {
        email: normalizedEmail,
        password,
        username: normalizedEmail,
      });
      userId = data.user.id.toString();

      const perfil = await strapiPost<StrapiPerfilData>('/perfis', {
        userId,
        nome,
        tipo: role,
        email: normalizedEmail,
        ativo: true,
        ...extra,
        ...buildPerfilComplianceFields(compliance),
      });
      if (compliance?.aceiteLegal) {
        await consentService.recordLegalAcceptance({
          userId,
          perfilId: perfil.data.id,
          ...(perfil.data.documentId ? { perfilDocumentId: perfil.data.documentId } : {}),
          actorRole: role,
          aceiteLegal: compliance.aceiteLegal,
          source: compliance.source,
          ...(compliance.dataNascimento ? { dataNascimento: compliance.dataNascimento } : {}),
          ...(compliance.consentimentoEncarregado ? { consentimentoEncarregado: compliance.consentimentoEncarregado } : {}),
        });
      }

      return await this.getUserById(userId);
    } catch (err) {
      if (userId) try { await this.rollbackRegistration(userId); } catch (rollbackError) { log.error({ rollbackError, userId }, 'Falha na compensação do registo'); }
      throw err;
    }
  },

  async rollbackRegistration(userId: string): Promise<void> {
    const perfis = await strapiGet<StrapiPerfilData>('/perfis', {
      'filters[userId][$eq]': userId,
      'populate[instituicaoGerida][fields][0]': 'id',
      'populate[instituicaoGerida][fields][1]': 'documentId',
      'pagination[pageSize]': '1',
    });
    const perfil = perfis.data[0];
    const errors: unknown[] = [];
    if (perfil?.instituicaoGerida) {
      try {
        await strapiDelete(`/instituicoes/${perfil.instituicaoGerida.documentId ?? String(perfil.instituicaoGerida.id)}`);
      } catch (error) {
        errors.push(error);
        log.error({ error, userId }, 'Falha ao remover instituição durante rollback');
      }
    }
    if (perfil?.id !== undefined) {
      try {
        await strapiDelete(`/perfis/${perfil.documentId ?? String(perfil.id)}`);
      } catch (error) {
        errors.push(error);
        log.error({ error, userId }, 'Falha ao remover perfil durante rollback');
      }
    }
    try {
      await strapiDeleteRaw(`/users/${userId}`);
    } catch (error) {
      errors.push(error);
      log.error({ error, userId }, 'Falha ao remover utilizador durante rollback');
    }
    if (errors.length > 0) throw new AggregateError(errors, 'Rollback de registo incompleto');
  },

  async getUserById(id: string): Promise<User> {
    const user = await strapiGetRaw<StrapiUser>(`/users/${id}`, { populate: 'role' });

    const resPerfil = await strapiGet<StrapiPerfilData>('/perfis', {
      'filters[userId][$eq]': id,
      'populate': ['foto', 'capa', 'conquistas'],
    });

    const perfilData = resPerfil.data[0] ?? null;
    const reputationScore = perfilData?.id === undefined
      ? 0
      : await getReputacao(String(perfilData.id));

    return this.mapStrapiUser(user, perfilData, reputationScore);
  },

  async findOrCreateUser(email: string, nome: string): Promise<User> {
    const normalizedEmail = email.toLowerCase().trim();
    const users = await strapiGetRaw<StrapiUser[]>('/users', {
      'filters[email][$eq]': normalizedEmail,
      'populate': 'role',
    });

    if (users[0]) {
      if (users[0].confirmed === false) {
        throw Object.assign(
          new Error('Conta com este email existe mas não está verificada. Use email/password para iniciar sessão.'),
          { status: 403 }
        );
      }
      return this.getUserById(users[0].id.toString());
    }

    const newUser = await strapiPostRaw<StrapiUser>('/users', {
      email: normalizedEmail,
      username: normalizedEmail,
      password: randomUUID(),
      role: await getAuthenticatedRoleId(),
      confirmed: true,
    });
    const userId = newUser.id.toString();

    await strapiPost('/perfis', {
      userId,
      nome,
      tipo: 'estudante',
      email: normalizedEmail,
      ativo: true,
      onboardingCompleto: false,
      ...buildPerfilComplianceFields({ source: 'oauth' }),
    });

    return this.getUserById(userId);
  },

  async setOauthProvider(userId: string, provider: 'google' | 'linkedin'): Promise<void> {
    const res = await strapiGet<StrapiPerfilData>('/perfis', {
      'filters[userId][$eq]': userId,
    });
    const perfil = res.data[0];
    if (!perfil?.id) {
      log.warn({ userId, provider }, 'Cannot set OAuth provider: perfil not found');
      return;
    }
    if (!perfil.oauthProvider) {
      const perfilId = perfil.documentId ?? String(perfil.id);
      await strapiPut(`/perfis/${perfilId}`, { oauthProvider: provider });
    }
  },

  mapStrapiUser(u: StrapiUser, perfil: StrapiPerfilData | null, reputationScore = 0): User {
    const oauthProvider = perfil?.oauthProvider;
    const consentsResult = ConsentStateSchema.safeParse(perfil?.consents);
    const estadoMenoridade = perfil?.estadoMenoridade ?? resolveEstadoMenoridade(perfil?.dataNascimento ?? undefined);
    return {
      id: u.id.toString(),
      email: u.email,
      nome: perfil?.nome ?? u.nome ?? u.username,
      role: resolveRole(u.role?.name, perfil?.tipo),
      perfilId: perfil?.id === undefined ? undefined : String(perfil.id),
      avatarUrl: resolvePerfilAvatar(perfil?.avatarUrl, perfil?.foto, u.avatar?.url),
      bannerUrl: perfil?.bannerUrl,
      reputacaoTier: getTier(reputationScore),
      xp: 0,
      reputacao: reputationScore,
      createdAt: u.createdAt ?? new Date().toISOString(),
      updatedAt: u.updatedAt ?? new Date().toISOString(),
      bio: perfil?.bio,
      areasInteresse: perfil?.areasInteresse ?? [],
      conquistas: perfil?.conquistas ?? [],
      aprovado: perfil?.aprovado,
      oauthVerified: perfil?.oauthVerified,
      oauthProvider: oauthProvider === 'google' || oauthProvider === 'linkedin' ? oauthProvider : undefined,
      onboardingCompleto: perfil?.onboardingCompleto ?? undefined,
      isMinor: estadoMenoridade === 'menor',
      estadoMenoridade,
      consentimentoEstado: perfil?.consentimentoEstado ?? undefined,
      consents: consentsResult.success ? consentsResult.data : {},
    };
  },
};
