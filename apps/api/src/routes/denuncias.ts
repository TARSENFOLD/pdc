import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { DenunciaComDetalhesSchema, type DenunciaComDetalhes } from '@pdc/shared';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { rateLimitDenuncias } from '../middleware/rateLimit.js';
import { toPaginatedResponse } from './pagination.js';
import { writeAuditLog } from '../middleware/audit.js';

type Vars = { Variables: AuthVariables };

const createSchema = z.object({
  conteudoId: z.string().min(1),
  conteudoTipo: z.string().min(1),
  motivo: z.string().min(10).max(1000),
});

const listQuerySchema = z.object({
  estado: z.enum(['pendente', 'em_analise', 'resolvida']).optional(),
  tipo: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const resolverSchema = z.object({
  accao: z.enum(['remover', 'avisar', 'ignorar']),
  nota: z.string().min(1).max(500),
});


function extractRelationData(value: unknown): Record<string, unknown> | undefined {
  if (value == null || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  if ('data' in record && record.data != null && typeof record.data === 'object') {
    const data = record.data as Record<string, unknown>;
    if ('attributes' in data && data.attributes != null && typeof data.attributes === 'object') {
      return { ...(data.attributes as Record<string, unknown>), id: data.id };
    }
    return { ...data };
  }
  if ('attributes' in record && record.attributes != null && typeof record.attributes === 'object') {
    return { ...(record.attributes as Record<string, unknown>), id: record.id };
  }
  return record;
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function asOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function normalizeDenuncia(raw: Record<string, unknown>): DenunciaComDetalhes {
  const denuncianteRaw = extractRelationData(raw.denunciante);
  const denunciante = denuncianteRaw
    ? {
        id: asString(denuncianteRaw.id ?? denuncianteRaw.documentId ?? ''),
        nome: asString(denuncianteRaw.nome),
        email: asString(denuncianteRaw.email),
        avatarUrl: asOptionalString(denuncianteRaw.avatarUrl) ?? null,
      }
    : undefined;

  const base = {
    id: asString(raw.id),
    denuncianteId: asString(raw.denuncianteId),
    conteudoId: asString(raw.conteudoId),
    conteudoTipo: asString(raw.conteudoTipo),
    motivo: asString(raw.motivo),
    estado: asString(raw.estado) || 'pendente',
    criadaEm: asString(raw.criadaEm),
    resolvidaEm: asOptionalString(raw.resolvidaEm),
    resolvidaPor: asOptionalString(raw.resolvidaPor),
    accaoTomada: asOptionalString(raw.accaoTomada),
    notasModerador: asOptionalString(raw.notasModerador),
    denunciante,
  };

  const parsed = DenunciaComDetalhesSchema.safeParse(base);
  if (!parsed.success) {
    throw new Error(`Denúncia normalizada inválida: ${parsed.error.message}`);
  }
  return parsed.data;
}

function normalizeDenunciaResponse(res: unknown): { data: DenunciaComDetalhes } {
  if (res == null || typeof res !== 'object') {
    throw new Error('Resposta do Strapi inválida para denúncia');
  }
  const record = res as Record<string, unknown>;
  const data = record.data;
  if (data == null || typeof data !== 'object') {
    throw new Error('Resposta do Strapi não contém data');
  }
  return { data: normalizeDenuncia(data as Record<string, unknown>) };
}

export const denunciaRoutes = new Hono<Vars>();

denunciaRoutes.use('*', verifyJwt);

// POST /denuncias — qualquer utilizador autenticado pode denunciar
denunciaRoutes.post('/', rateLimitDenuncias, zValidator('json', createSchema), async (c) => {
  const { id: denuncianteId } = c.get('user');
  const body = c.req.valid('json');
  try {
    const data = await strapiPost<unknown>('/denuncias', {
      ...body,
      denuncianteId,
      estado: 'pendente',
      criadaEm: new Date().toISOString(),
    });
    return c.json(data, 201);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// GET /denuncias — moderadores e super_admin
denunciaRoutes.get(
  '/',
  checkRole(['moderador', 'super_admin']),
  zValidator('query', listQuerySchema),
  async (c) => {
    const q = c.req.valid('query');
    const params: Record<string, string> = { populate: 'denunciante' };
    if (q.estado !== undefined) params['filters[estado][$eq]'] = q.estado;
    if (q.tipo !== undefined) params['filters[conteudoTipo][$eq]'] = q.tipo;
    if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
    if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
    try {
      const res = await strapiGet<unknown>('/denuncias', params);
      return c.json(toPaginatedResponse(res));
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);

// GET /denuncias/:id — moderadores e super_admin
denunciaRoutes.get('/:id', checkRole(['moderador', 'super_admin']), async (c) => {
  const id = c.req.param('id');
  try {
    const res = await strapiGet<unknown>(`/denuncias/${id ?? ''}`, { populate: 'denunciante' });
    return c.json(normalizeDenunciaResponse(res));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// PUT /denuncias/:id/resolver — moderadores e super_admin
denunciaRoutes.put(
  '/:id/resolver',
  checkRole(['moderador', 'super_admin']),
  zValidator('json', resolverSchema),
  async (c) => {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    try {
      const data = await strapiPut<unknown>(`/denuncias/${id}`, {
        estado: 'resolvida',
        accao: body.accao,
        nota: body.nota,
      });

      await writeAuditLog({
        actor: c.get('user'),
        accao: 'denuncia_resolver', 
        recurso: `/denuncias/${id}`, 
        ip: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
        userAgent: c.req.header('user-agent'),
        detalhes: { accao: body.accao, nota: body.nota },
      }).catch(() => {});

      return c.json(data);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);
