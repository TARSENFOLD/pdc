import { jwtVerify, createRemoteJWKSet } from 'jose';
import { Redis } from '@upstash/redis';
import { strapiPostRaw, strapiGet } from '../strapi/strapi.client.js';
import type { LtiLaunchClaims, LtiPlataforma, User } from '@pdc/shared';
import { env } from '../../lib/env.js';

const redis = env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

export const ltiService = {
  async generateNonce(state: string): Promise<string> {
    const nonce = Math.random().toString(36).substring(2);
    if (redis) {
      await redis.set(`nonce:${state}`, nonce, { ex: 600 });
    }
    return nonce;
  },

  async validateNonce(nonce: string, state: string): Promise<boolean> {
    if (!redis) return true;
    const stored = await redis.get<string>(`nonce:${state}`);
    if (stored === nonce) {
      await redis.del(`nonce:${state}`);
      return true;
    }
    return false;
  },

  async fetchLmsJwks(jwksUri: string) {
    const cacheKey = `jwks:${jwksUri}`;
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return createRemoteJWKSet(new URL(jwksUri)); // jose handles internals
    }
    const jwks = createRemoteJWKSet(new URL(jwksUri));
    if (redis) {
      await redis.set(cacheKey, 'cached', { ex: 3600 });
    }
    return jwks;
  },

  async validateLaunchJwt(idToken: string, plataforma: LtiPlataforma): Promise<LtiLaunchClaims> {
    const JWKS = await this.fetchLmsJwks(plataforma.keySetUrl);
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: plataforma.issuer,
      audience: plataforma.clientId,
    });
    return payload as unknown as LtiLaunchClaims;
  },

  async upsertLtiUser(claims: LtiLaunchClaims): Promise<User> {
    const email = claims.email || `${claims.sub}@lti.usepdc.com`;
    const username = claims.sub;
    const nome = claims.name || claims.given_name || username;

    try {
      // Tentar criar utilizador LTI
      // O endpoint /users do Strapi não usa o wrapper { data: ... }
      return await strapiPostRaw<User>('/users', {
        email,
        username,
        ltiSub: claims.sub,
        nome,
        role: 'aluno',
        confirmed: true,
      });
    } catch (err) {
      // Se falhar por email duplicado, buscar o existente
      const res = await strapiGet<User>('/users', {
        'filters[email][$eq]': email,
      });
      const firstUser = res.data[0];
      if (firstUser) return firstUser;
      throw err;
    }
  },
};
