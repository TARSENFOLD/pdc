import { SignJWT } from 'jose';
import { getPrivateKey, KEY_ID } from '../lti/lti.jwks.js';
import { TelemetryTokenPayload } from '@pdc/shared';

/**
 * Assina um JWT curto (1 hora) usando a chave privada RS256 partilhada do LTI.
 * Este token confere autoridade para ingestão direta ao Edge Worker.
 */
export async function signTelemetryToken(userId: string, perfilId: string): Promise<string> {
  const privateKey = await getPrivateKey();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600; // 1 hora

  // Preenchemos o payload omitindo exp e iat porque a API .setIssuedAt e .setExpirationTime
  // tratam disso matematicamente e garantem a formatação.
  const payload: Omit<TelemetryTokenPayload, 'exp' | 'iat'> = {
    sub: userId,
    perfilId,
    iss: 'pdc-v2-bff',
    aud: 'pdc-v2-edge',
  };

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: KEY_ID })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(privateKey);
}
