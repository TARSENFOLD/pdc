import { Hono } from 'hono';
import { z } from 'zod';
import pino from 'pino';

const log = pino({ name: 'moderacao-routes' });
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPut } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };

interface StrapiItem {
  id: string | number;
  titulo?: string;
  estado?: string;
  createdAt?: string;
  autor?: { nome?: string };
  autorId?: { nome?: string };
}

const RejeitarPayloadSchema = z.object({
  motivo: z.string().min(10).max(500),
});

const moderacaoRoutes = new Hono<Vars>();

moderacaoRoutes.use('*', verifyJwt);
moderacaoRoutes.use('*', checkRole(['moderador', 'comite_cientifico', 'super_admin']));

// ─── GET /moderacao/fila ──────────────────────────────────────────────────────

moderacaoRoutes.get('/fila', async (c) => {
  try {
    const tipo = c.req.query('tipo');
    const page = c.req.query('page') || '1';
    const pageSize = c.req.query('pageSize') || '10';

    if (!tipo || !['curso', 'simulacao', 'experiencia'].includes(tipo)) {
      return c.json({ error: 'Tipo invalido' }, 400);
    }

    const colecionNome = `${tipo}s`;

    // Fix: Generic type represents the item. Client flattens into StrapiListResponse<T>.
    const [itemsRes, totalRes] = await Promise.all([
      strapiGet<StrapiItem>(`/${colecionNome}`, {
        'filters[estado][$eq]': 'review',
        'pagination[page]': page,
        'pagination[pageSize]': pageSize,
        'fields': 'id,titulo,estado,createdAt',
        'populate': 'autor,autorId',
      }),
      strapiGet<StrapiItem>(`/${colecionNome}`, {
        'filters[estado][$eq]': 'review',
        'pagination[pageSize]': '1',
      }),
    ]);

    const lista = itemsRes.data.map((item) => ({
      id: item.id,
      titulo: item.titulo,
      autorNome: item.autor?.nome || item.autorId?.nome || 'Desconhecido',
      submittedAt: item.createdAt,
      tipo,
    }));

    return c.json({
      data: lista,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: totalRes.meta.pagination.total,
        pageCount: totalRes.meta.pagination.pageCount,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Erro ao buscar fila de moderacao');
    return c.json({ error: 'Erro ao buscar fila' }, 500);
  }
});

// ─── PUT /moderacao/:tipo/:id/aprovar ──────────────────────────────────────────

moderacaoRoutes.put('/:tipo/:id/aprovar', async (c) => {
  const tipo = c.req.param('tipo');
  const id = c.req.param('id');

  if (!['curso', 'simulacao', 'experiencia'].includes(tipo)) {
    return c.json({ error: 'Tipo invalido' }, 400);
  }

  try {
    const colecionNome = `${tipo}s`;

    const res = await strapiGet<StrapiItem>(`/${colecionNome}/${id}`);
    if (!res.data[0]) {
      return c.json({ error: 'Item nao encontrado' }, 404);
    }

    await strapiPut(`/${colecionNome}/${id}`, {
      estado: 'approved',
    });

    return c.json({ success: true });
  } catch (error) {
    log.error({ err: error }, 'Erro ao aprovar item');
    return c.json({ error: 'Erro ao aprovar' }, 500);
  }
});

// ─── PUT /moderacao/:tipo/:id/rejeitar ────────────────────────────────────────

moderacaoRoutes.put('/:tipo/:id/rejeitar', async (c) => {
  const tipo = c.req.param('tipo');
  const id = c.req.param('id');

  if (!['curso', 'simulacao', 'experiencia'].includes(tipo)) {
    return c.json({ error: 'Tipo invalido' }, 400);
  }

  try {
    RejeitarPayloadSchema.parse(await c.req.json());
    const colecionNome = `${tipo}s`;

    const res = await strapiGet<StrapiItem>(`/${colecionNome}/${id}`);
    if (!res.data[0]) {
      return c.json({ error: 'Item nao encontrado' }, 404);
    }

    await strapiPut(`/${colecionNome}/${id}`, {
      estado: 'draft',
    });

    return c.json({ success: true });
  } catch (error) {
    log.error({ err: error }, 'Erro ao rejeitar item');
    return c.json({ error: 'Erro ao rejeitar' }, 500);
  }
});

export { moderacaoRoutes };
