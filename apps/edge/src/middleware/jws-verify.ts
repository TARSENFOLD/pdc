import { Context, Next } from 'hono';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { TelemetryTokenPayloadSchema } from '@pdc/shared';

// Cache do Set de Chaves em memória (Isolate scope) partilhada
// Evita requests para o BFF a cada nova telemetria (TTL: 1 Hora)
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;
let lastFetch = 0;

export const jwsVerifyMiddleware = async (c: Context, next: Next) => {
  const headerToken = c.req.header('X-Telemetry-Token');
  const authHeader = c.req.header('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : undefined;
  
  const token = headerToken || bearerToken;
  
  if (!token) {
    return c.json({ error: 'Autoridade negada: token ausente' }, 401);
  }

  // Apanhar o IP ou host do BFF do nosso environment (gerido via CI/CD)
  const bffUrl = c.env.BFF_URL as string | undefined;
  if (!bffUrl) {
    return c.json({ error: 'Configuração BFF_URL ausente no Edge' }, 500);
  }

  const now = Date.now();
  // Refresh cache a cada 1 hora (3600000 ms)
  if (!jwksCache || now - lastFetch > 3600000) {
    try {
      const jwksUrl = new URL('/.well-known/jwks.json', bffUrl);
      jwksCache = createRemoteJWKSet(jwksUrl);
      lastFetch = now;
    } catch {
      return c.json({ error: 'Configuração BFF_URL inválida' }, 500);
    }
  }

  try {
    // Validar usando jose: aud, iss, exp e signature RS256 garantidos.
    const { payload } = await jwtVerify(token, jwksCache, {
      issuer: 'pdc-v2-bff',
      audience: 'pdc-v2-edge',
      algorithms: ['RS256'],
    });

    const result = TelemetryTokenPayloadSchema.safeParse(payload);
    if (!result.success) {
      return c.json({ error: 'Payload do token inválido' }, 401);
    }

    // Injetar contexto decodificado seguro para jusante
    c.set('userId', result.data.sub);
    c.set('perfilId', result.data.perfilId);

    await next();
  } catch (err: unknown) {
    return c.json({ error: 'Autoridade negada: token inválido ou expirado' }, 401);
  }
};
