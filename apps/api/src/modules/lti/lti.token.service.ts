import { SignJWT } from 'jose';
import { redis } from '../../lib/redis.js';
import { getPrivateKey, KEY_ID } from './lti.jwks.js';
import { strapiGet } from '../strapi/strapi.client.js';
import type { LtiPlataforma } from '@pdc/shared';

export const ltiTokenService = {
  async getAccessToken(plataformaId: string): Promise<string> {
    const cacheKey = `lti_token:${plataformaId}`;
    
    try {
      const cached = await redis.get<string>(cacheKey);
      if (cached) return cached;
    } catch (err) {
      // Redis fail shouldn't block, just log
      console.warn('Redis error in ltiTokenService:', err);
    }

    // 1. Buscar detalhes da plataforma
    const res = await strapiGet<LtiPlataforma>(`/lti-plataformas/${plataformaId}`);
    const plataforma = res.data[0];
    if (!plataforma) throw new Error(`Plataforma LTI ${plataformaId} não encontrada`);

    // 2. Gerar Client Assertion JWT
    const privateKey = await getPrivateKey();
    const clientAssertion = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: KEY_ID })
      .setIssuedAt()
      .setIssuer(plataforma.clientId)
      .setSubject(plataforma.clientId)
      .setAudience(plataforma.authTokenUrl)
      .setExpirationTime('1m')
      .setJti(crypto.randomUUID())
      .sign(privateKey);

    // 3. Trocar por Access Token no LMS
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
    params.append('client_assertion', clientAssertion);
    params.append('scope', 'https://purl.imsglobal.org/spec/lti-ags/scope/score');

    const tokenRes = await fetch(plataforma.authTokenUrl, {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      throw new Error(`Falha ao obter access token LTI: ${tokenRes.status} ${errBody}`);
    }

    const tokenData = await tokenRes.json() as { access_token: string; expires_in: number };
    
    // 4. Cachear com margem de segurança (5 min)
    const ttl = Math.max(0, tokenData.expires_in - 300);
    if (ttl > 0) {
      await redis.set(cacheKey, tokenData.access_token, { ex: ttl }).catch(() => {});
    }

    return tokenData.access_token;
  }
};
