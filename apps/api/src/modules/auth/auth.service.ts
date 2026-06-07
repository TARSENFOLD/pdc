import { SignJWT, jwtVerify } from 'jose';
import { redis } from '../../lib/redis.js';
import { env } from '../../lib/env.js';
import {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_TTL,
} from './auth.constants.js';
import { createHash, randomUUID } from 'node:crypto';
import { type User, type Role, type Conquista, RoleSchema, normalizeTipo } from '@pdc/shared';
import { strapiGetRaw, strapiPostRaw, strapiGet, strapiPost, strapiPut } from '../strapi/strapi.client.js';
import { getReputacao, getTier } from '../reputation/reputation.service.js';
import { z } from 'zod';
import pino from 'pino';

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const log = pino({ name: 'auth-service' });

const RefreshPayloadSchema = z.object({
  sub: z.string().min(1),
});

interface StrapiUser {
  id: number | string;
  email: string;
  username: string;
  nome?: string;
  confirmed?: boolean;
  role?: { name: string };
  avatar?: { url: string };
  createdAt?: string;
  updatedAt?: string;
}

interface StrapiUsersPermissionsRole {
  id: number | string;
  name: string;
  type: string;
}

interface StrapiUsersPermissionsRolesResponse {
  roles: StrapiUsersPermissionsRole[];
}

interface StrapiPerfilData {
  id?: string;
  userId: string;
  nome?: string;
  tipo?: string;
  bio?: string;
  reputacao?: number;
  foto?: { url?: string } | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  areasInteresse?: string[];
  conquistas?: Conquista[];
  aprovado?: boolean;
  oauthVerified?: boolean;
  oauthProvider?: string;
  onboardingCompleto?: boolean;
}

function resolveRole(strapiRoleName: string | undefined, perfilTipo: string | undefined): Role {
  if (perfilTipo) {
    const parsed = RoleSchema.safeParse(perfilTipo);
    if (parsed.success) return parsed.data;
  }
  if (strapiRoleName) {
    const lower = strapiRoleName.toLowerCase();
    if (lower === 'admin' || lower === 'super admin') return 'super_admin';
    return normalizeTipo(lower);
  }
  return 'estudante';
}

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
    claims.onboardingCompleto = user.onboardingCompleto;
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

  async register(email: string, password: string, nome: string): Promise<User> {
    return this.registerWithRole(email, password, nome, 'estudante', {});
  },

  async registerWithRole(
    email: string,
    password: string,
    nome: string,
    role: Role,
    extra: Record<string, unknown>,
  ): Promise<User> {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUsers = await strapiGetRaw<StrapiUser[]>('/users', {
      'filters[email][$eq]': normalizedEmail,
      'pagination[pageSize]': '1',
    });
    if (existingUsers[0]) {
      throw Object.assign(new Error('Já existe uma conta com este email. Inicia sessão ou usa recuperação de palavra-passe.'), { status: 409 });
    }

    const data = await strapiPostRaw<{ user: StrapiUser }>('/auth/local/register', {
      email: normalizedEmail,
      password,
      username: normalizedEmail,
    });
    const userId = data.user.id.toString();

    await strapiPost('/perfis', {
      userId,
      nome,
      tipo: role,
      email: normalizedEmail,
      ativo: true,
      ...extra,
    });

    return this.getUserById(userId);
  },

  async getUserById(id: string): Promise<User> {
    const user = await strapiGetRaw<StrapiUser>(`/users/${id}`, { populate: 'role' });

    const resPerfil = await strapiGet<StrapiPerfilData>('/perfis', {
      'filters[userId][$eq]': id,
      'populate': ['foto', 'capa', 'conquistas'],
    });

    const perfilData = resPerfil.data[0] ?? null;
    const reputationScore = perfilData === null ? 0 : await getReputacao(perfilData.id);

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
      await strapiPut(`/perfis/${perfil.id}`, { oauthProvider: provider });
    }
  },

  mapStrapiUser(u: StrapiUser, perfil: StrapiPerfilData | null, reputationScore = 0): User {
    const oauthProvider = perfil?.oauthProvider;
    return {
      id: u.id.toString(),
      email: u.email,
      nome: perfil?.nome ?? u.nome ?? u.username,
      role: resolveRole(u.role?.name, perfil?.tipo),
      perfilId: perfil?.id,
      avatarUrl: perfil?.foto?.url ?? perfil?.avatarUrl ?? u.avatar?.url,
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
      onboardingCompleto: perfil?.onboardingCompleto,
    };
  },
};
