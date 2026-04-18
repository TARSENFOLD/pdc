import { describe, expect, it, vi } from 'vitest';
import { signTelemetryToken } from './telemetry-token.js';
import { jwtVerify, createLocalJWKSet, exportJWK } from 'jose';
import * as jwksModule from '../lti/lti.jwks.js';

describe('signTelemetryToken', () => {
  it('deve assinar um token RS256 com os claims correctos', async () => {
    // Gerar um ephemeral keypair local para isolamento do teste
    const { generateKeyPair } = await import('jose');
    const { privateKey, publicKey } = await generateKeyPair('RS256');

    // Mockar a key real do Strapi pelo nosso stub seguro de testes
    vi.spyOn(jwksModule, 'getPrivateKey').mockResolvedValue(privateKey);

    const token = await signTelemetryToken('test-user-uuid', 'test-perfil-uuid');
    expect(token).toBeDefined();

    // Exportar e criar cache público para simular o processo do Edge Verify
    const jwk = await exportJWK(publicKey);
    const localJwks = createLocalJWKSet({ keys: [{ ...jwk, kid: jwksModule.KEY_ID, alg: 'RS256' }] });

    // Validar do lado consumidor (Mock do Cloudflare Worker / Edge)
    const { payload, protectedHeader } = await jwtVerify(token, localJwks, {
      issuer: 'pdc-v2-bff',
      audience: 'pdc-v2-edge',
    });

    expect(protectedHeader.alg).toBe('RS256');
    expect(protectedHeader.kid).toBe(jwksModule.KEY_ID);
    
    expect(payload.sub).toBe('test-user-uuid');
    expect(payload.perfilId).toBe('test-perfil-uuid');
    expect(payload.exp).toBeDefined();
    expect(payload.iat).toBeDefined();
    
    // Verificar que a Math.floor iat + 3600 está precisa (expiração 1h)
    if (payload.exp && payload.iat) {
      expect(payload.exp - payload.iat).toBe(3600);
    }
  });
});
