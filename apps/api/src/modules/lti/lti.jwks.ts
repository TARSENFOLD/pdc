import { exportJWK, importPKCS8, importSPKI } from 'jose';

const PRIVATE_KEY = process.env['LTI_PRIVATE_KEY'] || '';
const PUBLIC_KEY = process.env['LTI_PUBLIC_KEY'] || '';
const KEY_ID = process.env['LTI_KEY_ID'] || 'pdc-lti-key-1';

export async function getPublicJwks() {
  if (!PUBLIC_KEY) {
    throw new Error('LTI_PUBLIC_KEY não configurada');
  }

  const jwk = await exportJWK(await importSPKI(PUBLIC_KEY, 'RS256'));

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
  if (!PRIVATE_KEY) {
    throw new Error('LTI_PRIVATE_KEY não configurada');
  }
  return importPKCS8(PRIVATE_KEY, 'RS256');
}
