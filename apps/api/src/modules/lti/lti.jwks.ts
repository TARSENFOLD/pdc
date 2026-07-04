import { exportJWK, importPKCS8, importSPKI } from 'jose';
import { env } from '../../lib/env.js';

function requireLtiKey(name: 'LTI_PRIVATE_KEY' | 'LTI_PUBLIC_KEY'): string {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} não configurada`);
  }
  return value;
}

export const KEY_ID = env.LTI_KEY_ID;

export async function getPublicJwks() {
  const publicKey = requireLtiKey('LTI_PUBLIC_KEY');
  const jwk = await exportJWK(await importSPKI(publicKey, 'RS256'));

  return {
    keys: [
      {
        ...jwk,
        kid: KEY_ID,
        use: 'sig',
        alg: 'RS256',
      },
    ],
  };
}

export async function getPrivateKey() {
  const privateKey = requireLtiKey('LTI_PRIVATE_KEY');
  return importPKCS8(privateKey, 'RS256');
}
