import { SignJWT, jwtVerify } from 'jose';
import { redis } from '../../lib/redis.js';
import { env } from '../../lib/env.js';
import { createHash, randomUUID } from 'node:crypto';
import type { User, Role } from '@pdc/shared';

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const STRAPI_URL = env.STRAPI_URL;
const STRAPI_API_TOKEN = env.STRAPI_API_TOKEN;

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
  tipo?: string;
  bio?: string;
  foto?: { data?: { attributes?: { url?: string } } } | null;
}

interface StrapiPerfilResponse {
  data: Array<{ attributes?: StrapiPerfilData } & StrapiPerfilData>;
}

const VALID_ROLES: Set<string> = new Set([
  'aluno', 'mentor', 'instituicao', 'moderador', 'comite_cientifico', 'super_admin',
]);

function resolveRole(strapiRoleName: string | undefined, perfilTipo: string | undefined): Role {
  // 1. Check perfil.tipo first (source of truth for PDC roles)
  if (perfilTipo && VALID_ROLES.has(perfilTipo)) {
    return perfilTipo as Role;
  }
  // 2. Check Strapi role name
  const normalized = strapiRoleName?.toLowerCase();
  if (normalized && VALID_ROLES.has(normalized)) {
    return normalized as Role;
  }
  // 3. Fallback: Strapi's "Authenticated" → aluno
  return 'aluno';
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function strapiHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
  };
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
    const res = await fetch(`${STRAPI_URL}/api/auth/local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email, password }),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const data = (await res.json()) as { user: StrapiUser };
    return this.getUserById(data.user.id.toString());
  },

  async register(email: string, password: string, nome: string): Promise<User> {
    return this.registerWithRole(email, password, nome, 'aluno', {});
  },

  async registerWithRole(
    email: string,
    password: string,
    nome: string,
    role: Role,
    extra: Record<string, unknown>,
  ): Promise<User> {
    // Strapi register only accepts: email, password, username
    const res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username: email }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(body?.error?.message ?? 'Registration failed');
    }
    const data = (await res.json()) as { user: StrapiUser };
    const userId = data.user.id.toString();

    // Create perfil with nome, role and extra fields
    const perfilRes = await fetch(`${STRAPI_URL}/api/perfis`, {
      method: 'POST',
      headers: strapiHeaders(),
      body: JSON.stringify({
        data: {
          userId,
          nome,
          tipo: role,
          email,
          ativo: true,
          ...extra,
        },
      }),
    });
    if (!perfilRes.ok) {
      const body = await perfilRes.json().catch(() => null) as Record<string, unknown> | null;
      throw new Error(
        `Falha ao criar perfil: ${perfilRes.status.toString()} ${JSON.stringify(body)}`
      );
    }

    return this.getUserById(userId);
  },

  async getUserById(id: string): Promise<User> {
    const res = await fetch(`${STRAPI_URL}/api/users/${id}?populate=role`, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    });
    if (!res.ok) {
      const status = res.status;
      if (status === 401 || status === 403) {
        throw new Error('Strapi API token inválido ou ausente');
      }
      throw new Error(`Utilizador não encontrado (${status.toString()})`);
    }
    const user = (await res.json()) as StrapiUser;

    const resPerfil = await fetch(
      `${STRAPI_URL}/api/perfis?filters[userId][$eq]=${id}&populate=foto`,
      { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } },
    );

    let perfilData: StrapiPerfilData | null = null;
    if (resPerfil.ok) {
      const perfilResponse = (await resPerfil.json()) as StrapiPerfilResponse;
      const first = perfilResponse.data?.[0];
      perfilData = first?.attributes ?? first ?? null;
    }
    return this.mapStrapiUser(user, perfilData);
  },

  async findOrCreateUser(email: string, nome: string): Promise<User> {
    const resSearch = await fetch(
      `${STRAPI_URL}/api/users?filters[email][$eq]=${encodeURIComponent(email)}&populate=role`,
      { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } },
    );
    const users = (await resSearch.json()) as StrapiUser[];
    if (users[0]) return this.getUserById(users[0].id.toString());

    // Create user via admin API (bypasses register — for OAuth)
    const resCreate = await fetch(`${STRAPI_URL}/api/users`, {
      method: 'POST',
      headers: strapiHeaders(),
      body: JSON.stringify({ email, username: email, confirmed: true }),
    });
    if (!resCreate.ok) throw new Error('Failed to create user');
    const newUser = (await resCreate.json()) as StrapiUser;
    const userId = newUser.id.toString();

    // Create perfil
    await fetch(`${STRAPI_URL}/api/perfis`, {
      method: 'POST',
      headers: strapiHeaders(),
      body: JSON.stringify({
        data: { userId, nome, tipo: 'aluno', email, ativo: true },
      }),
    });

    return this.getUserById(userId);
  },

  mapStrapiUser(u: StrapiUser, perfil: StrapiPerfilData | null): User {
    const perfilNome = perfil && 'nome' in perfil ? (perfil as Record<string, unknown>).nome as string | undefined : undefined;
    return {
      id: u.id.toString(),
      email: u.email,
      nome: perfilNome ?? u.nome ?? u.username,
      role: resolveRole(u.role?.name, perfil?.tipo),
      avatarUrl: perfil?.foto?.data?.attributes?.url ?? u.avatar?.url,
      createdAt: u.createdAt ?? new Date().toISOString(),
      updatedAt: u.updatedAt ?? new Date().toISOString(),
      bio: perfil?.bio,
    };
  },
};
