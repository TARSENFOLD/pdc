import { Context, Next } from 'hono';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { TelemetryTokenPayloadSchema } from '@pdc/shared';

// JWKS cache TTL: 60s per spec E2-T3 (was 1h, reduced to allow fast key rotation propagation)
const JWKS_CACHE_TTL_MS = 60_000;

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;
let lastFetch = 0;

function buildJWKS(bffUrl: string) {
  return createRemoteJWKSet(new URL('/.well-known/jwks.json', bffUrl));
}

function getOrCreateJWKS(bffUrl: string) {
  const now = Date.now();
  if (!jwksCache || now - lastFetch > JWKS_CACHE_TTL_MS) {
    jwksCache = buildJWKS(bffUrl);
    lastFetch = now;
  }
  return jwksCache;
}

function invalidateJWKS(bffUrl: string) {
  // Force-refresh on kid mismatch so key rotation propagates in ≤60s
  jwksCache = buildJWKS(bffUrl);
  lastFetch = Date.now();
  return jwksCache;
}

const JWT_OPTIONS = {
  issuer: 'pdc-v2-bff',
  audience: 'pdc-v2-edge',
  algorithms: ['RS256'] as string[],
};

export type EdgeContextEnv = {
  Bindings: {
    BFF_URL?: string;
  };
  Variables: {
    userId: string;
    perfilId: string;
  };
};

function isJwksNoMatchingKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ERR_JWKS_NO_MATCHING_KEY'
  );
}

export const jwsVerifyMiddleware = async (c: Context<EdgeContextEnv>, next: Next) => {
  const headerToken = c.req.header('X-Telemetry-Token');
  const authHeader = c.req.header('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : undefined;

  const token = headerToken || bearerToken;

  if (!token) {
    return c.json({ error: 'Autoridade negada: token ausente' }, 401);
  }

  const bffUrl = c.env.BFF_URL;
  if (!bffUrl) {
    return c.json({ error: 'Configuração BFF_URL ausente no Edge' }, 500);
  }

  // Enforce HTTPS for BFF_URL (Spec E2-T3 Hardening)
  try {
    const parsedUrl = new URL(bffUrl);
    const hostname = parsedUrl.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    
    if (parsedUrl.protocol !== 'https:' && !isLocal) {
      return c.json({ error: 'BFF_URL deve usar HTTPS (exceto em desenvolvimento local)' }, 500);
    }
  } catch {
    return c.json({ error: 'Configuração BFF_URL inválida' }, 500);
  }

  let jwks = getOrCreateJWKS(bffUrl);
  let rawPayload: Awaited<ReturnType<typeof jwtVerify>>['payload'];

  try {
    ({ payload: rawPayload } = await jwtVerify(token, jwks, JWT_OPTIONS));
  } catch (firstErr: unknown) {
    // kid not in cached JWKS → force-refresh once and retry (key rotation path)
    if (isJwksNoMatchingKey(firstErr)) {
      try {
        jwks = invalidateJWKS(bffUrl);
        ({ payload: rawPayload } = await jwtVerify(token, jwks, JWT_OPTIONS));
      } catch {
        // Fail-closed: if BFF JWKS unreachable or key still invalid, deny
        return c.json({ error: 'Autoridade negada: token inválido ou expirado' }, 401);
      }
    } else {
      return c.json({ error: 'Autoridade negada: token inválido ou expirado' }, 401);
    }
  }

  const result = TelemetryTokenPayloadSchema.safeParse(rawPayload);
  if (!result.success) {
    return c.json({ error: 'Payload do token inválido' }, 401);
  }

  c.set('userId', result.data.sub);
  c.set('perfilId', result.data.perfilId);

  await next();
};
