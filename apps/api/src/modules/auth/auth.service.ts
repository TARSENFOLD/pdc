import { SignJWT, jwtVerify } from 'jose';
import { redis } from '../../lib/redis.js';
import { env } from '../../lib/env.js';
import { createHash, randomUUID } from 'node:crypto';
import { type User, type Role, type Conquista, RoleSchema, normalizeTipo } from '@pdc/shared';
import { strapiGetRaw, strapiPostRaw, strapiGet, strapiPost } from '../strapi/strapi.client.js';
import { getReputacao, getTier } from '../reputation/reputation.service.js';

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

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

interface StrapiPerfilData {
  id?: string;
  userId: string;
  nome?: string;
  tipo?: string;
  bio?: string;
  reputacao?: number;
  foto?: { url?: string } | null;
  areasInteresse?: string[];
  conquistas?: Conquista[];
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

export const authService = {
  async generateTokens(user: User) {
    const accessToken = await new SignJWT({ sub: user.id, role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(JWT_SECRET);
    const refreshToken = await new SignJWT({ sub: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .setJti(randomUUID())
      .sign(JWT_SECRET);
    return { accessToken, refreshToken };
  },

  async saveRefreshToken(userId: string, token: string) {
    const hash = hashToken(token);
    await redis.set(`refresh_token:${userId}:${hash}`, 'true', { ex: 7 * 24 * 60 * 60 });
  },

  async revokeRefreshToken(userId: string, token: string) {
    const hash = hashToken(token);
    await redis.del(`refresh_token:${userId}:${hash}`);
  },

  async verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const userId = payload.sub as string;
      const hash = hashToken(token);
      const exists = await redis.get(`refresh_token:${userId}:${hash}`);
      return exists ? { userId } : null;
    } catch {
      return null;
    }
  },

  async login(email: string, password: string): Promise<User> {
    const data = await strapiPostRaw<{ user: StrapiUser }>('/auth/local', {
      identifier: email,
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
    const data = await strapiPostRaw<{ user: StrapiUser }>('/auth/local/register', {
      email,
      password,
      username: email,
    });
    const userId = data.user.id.toString();

    await strapiPost('/perfis', {
      userId,
      nome,
      tipo: role,
      email,
      ativo: true,
      ...extra,
    });

    return this.getUserById(userId);
  },

  async getUserById(id: string): Promise<User> {
    const user = await strapiGetRaw<StrapiUser>(`/users/${id}`, { populate: 'role' });

    const resPerfil = await strapiGet<StrapiPerfilData>('/perfis', {
      'filters[userId][$eq]': id,
      'populate': ['foto', 'conquistas'],
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
      confirmed: true,
    });
    const userId = newUser.id.toString();

    await strapiPost('/perfis', {
      userId,
      nome,
      tipo: 'estudante',
      email: normalizedEmail,
      ativo: true,
    });

    return this.getUserById(userId);
  },

  mapStrapiUser(u: StrapiUser, perfil: StrapiPerfilData | null, reputationScore = 0): User {
    return {
      id: u.id.toString(),
      email: u.email,
      nome: perfil?.nome ?? u.nome ?? u.username,
      role: resolveRole(u.role?.name, perfil?.tipo),
      perfilId: perfil?.id,
      avatarUrl: perfil?.foto?.url ?? u.avatar?.url,
      reputacaoTier: getTier(reputationScore),
      xp: 0,
      reputacao: reputationScore,
      createdAt: u.createdAt ?? new Date().toISOString(),
      updatedAt: u.updatedAt ?? new Date().toISOString(),
      bio: perfil?.bio,
      areasInteresse: perfil?.areasInteresse ?? [],
      conquistas: perfil?.conquistas ?? [],
    };
  },
};
