import { SignJWT, jwtVerify } from 'jose';
import { redis } from '../../lib/redis.js';
import { createHash, randomUUID } from 'node:crypto';
import type { User, Role } from '@pdc/shared';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-me-in-production-min-32-chars'
);
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || '';

interface StrapiUser {
  id: number | string;
  email: string;
  username: string;
  nome?: string;
  role?: { name: string };
  avatar?: { url: string };
  createdAt?: string;
  updatedAt?: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

let cachedAlunoRoleId: string | null = null;

async function getAlunoRoleId(): Promise<string> {
  if (cachedAlunoRoleId) return cachedAlunoRoleId;
  const res = await fetch(`${STRAPI_URL}/api/users-permissions/roles`, {
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
  });
  const data = (await res.json()) as { roles: { id: string; name: string }[] };
  const aluno = data.roles.find((r) => r.name === 'Aluno' || r.name === 'aluno');
  if (!aluno) throw new Error('Role Aluno não encontrada');
  cachedAlunoRoleId = aluno.id.toString();
  return cachedAlunoRoleId;
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

  async registerWithRole(email: string, password: string, nome: string, role: Role, extra: Record<string, unknown>): Promise<User> {
    const res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username: email, nome, role, ...extra }),
    });
    if (!res.ok) throw new Error('Registration failed');
    const data = (await res.json()) as { user: StrapiUser };
    return this.getUserById(data.user.id.toString());
  },

  async getUserById(id: string): Promise<User> {
    const res = await fetch(`${STRAPI_URL}/api/users/${id}?populate=role`, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    });
    if (!res.ok) throw new Error('User not found');
    const user = (await res.json()) as StrapiUser;

    const resPerfil = await fetch(`${STRAPI_URL}/api/perfils?filters[userId][$eq]=${id}&populate=*`, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    });
    
    let perfilData: any = null;
    if (resPerfil.ok) {
      const data = (await resPerfil.json()) as { data: { attributes: any }[] };
      perfilData = data.data?.[0]?.attributes;
    }
    return this.mapStrapiUser(user, perfilData);
  },

  async findOrCreateUser(email: string, nome: string): Promise<User> {
    const resSearch = await fetch(`${STRAPI_URL}/api/users?filters[email][$eq]=${email}&populate=role`, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    });
    const users = (await resSearch.json()) as StrapiUser[];
    if (users[0]) return this.getUserById(users[0].id.toString());

    const alunoRoleId = await getAlunoRoleId();
    const resCreate = await fetch(`${STRAPI_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      body: JSON.stringify({ email, username: email, nome, confirmed: true, role: alunoRoleId }),
    });
    if (!resCreate.ok) throw new Error('Failed to create user');
    const newUser = (await resCreate.json()) as StrapiUser;
    return this.getUserById(newUser.id.toString());
  },

  mapStrapiUser(u: StrapiUser, perfil?: any): User {
    return {
      id: u.id.toString(),
      email: u.email,
      nome: u.nome ?? u.username,
      role: (u.role?.name.toLowerCase() ?? 'aluno') as Role,
      avatarUrl: perfil?.foto?.data?.attributes?.url ?? u.avatar?.url,
      createdAt: u.createdAt ?? new Date().toISOString(),
      updatedAt: u.updatedAt ?? new Date().toISOString(),
      bio: perfil?.bio,
    };
  },
};
