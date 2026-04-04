import { SignJWT, jwtVerify } from 'jose';
import { Redis } from '@upstash/redis';
import { createHash, randomUUID } from 'node:crypto';
import type { User, Role } from '@pdc/shared';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-me-in-production-min-32-chars'
);
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || '';

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

interface StrapiUser {
  id: number | string;
  email: string;
  username: string;
  nome?: string;
  role?: {
    name: string;
  };
  avatar?: {
    url: string;
  };
  createdAt?: string;
  updatedAt?: string;
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
    if (!redis) {
      console.warn('Redis not configured, refresh tokens will not be persisted');
      return;
    }
    const hash = hashToken(token);
    await redis.set(`refresh_token:${userId}:${hash}`, 'true', { ex: 7 * 24 * 60 * 60 });
  },

  async revokeRefreshToken(userId: string, token: string) {
    if (!redis) return;
    const hash = hashToken(token);
    await redis.del(`refresh_token:${userId}:${hash}`);
  },

  async verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
    if (!redis) {
      console.warn('Redis not configured, refresh token verification bypassed');
      return null;
    }
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

    if (!res.ok) {
      const error = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(error.error?.message || 'Invalid credentials');
    }
    const data = (await res.json()) as { user: StrapiUser };
    return this.mapStrapiUser(data.user);
  },

  async register(email: string, password: string, nome: string): Promise<User> {
    const res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username: email, nome, role: 'aluno' }),
    });

    if (!res.ok) {
      const error = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(error.error?.message || 'Registration failed');
    }
    const data = (await res.json()) as { user: StrapiUser };
    return this.mapStrapiUser(data.user);
  },

  async getUserById(id: string): Promise<User> {
    const res = await fetch(`${STRAPI_URL}/api/users/${id}?populate=role`, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    });
    if (!res.ok) throw new Error('User not found');
    const data = (await res.json()) as StrapiUser;
    return this.mapStrapiUser(data);
  },

  async findOrCreateUser(email: string, nome: string): Promise<User> {
    // 1. Tentar buscar por email
    const resSearch = await fetch(`${STRAPI_URL}/api/users?filters[email][$eq]=${email}&populate=role`, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    });
    const users = (await resSearch.json()) as StrapiUser[];
    if (users.length > 0) {
      return this.mapStrapiUser(users[0]!);
    }

    // 2. Se não existir, criar (registo social sem password)
    const resCreate = await fetch(`${STRAPI_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify({
        email,
        username: email,
        nome,
        confirmed: true,
        role: 1, // Assumindo que 1 é o ID da role 'aluno' no Strapi
      }),
    });

    if (!resCreate.ok) {
      const error = (await resCreate.json()) as { error?: { message?: string } };
      throw new Error(error.error?.message || 'Failed to create social user');
    }
    const newUser = (await resCreate.json()) as StrapiUser;
    // Precisamos de repopular a role se o POST /users não retornar a role populada
    return this.getUserById(newUser.id.toString());
  },

  mapStrapiUser(u: StrapiUser): User {
    return {
      id: u.id.toString(),
      email: u.email,
      nome: u.nome || u.username,
      role: (u.role?.name?.toLowerCase() as Role) || 'aluno',
      avatarUrl: u.avatar?.url || undefined,
      createdAt: u.createdAt || new Date().toISOString(),
      updatedAt: u.updatedAt || new Date().toISOString(),
    };
  },
};
