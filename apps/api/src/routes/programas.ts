import { Hono } from 'hono';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';

type Vars = { Variables: AuthVariables };
export const programaRoutes = new Hono<Vars>();

// ... (GET /programas e GET /programas/:id)

// ─── Rotas Públicas ──────────────────────────────────────────────────────────

programaRoutes.get('/', async (c) => {
  try {
    const data = await strapiGet<any>('/programas', {
      populate: 'instituicao,capa',
      'filters[estado][$eq]': 'published'
    });
    return c.json(data);
  } catch (err) {
    return c.json({ error: 'Erro ao carregar catálogo de programas' }, 502);
  }
});

programaRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const data = await strapiGet<any>(`/programas/${id}`, {
      populate: 'instituicao,capa,cursos,experiencias'
    });
    return c.json(data);
  } catch (err) {
    return c.json({ error: 'Programa não encontrado' }, 404);
  }
});

// ─── Rotas Protegidas ─────────────────────────────────────────────────────────

programaRoutes.use('*', verifyJwt);

// POST /programas/:id/inscrever
programaRoutes.post('/:id/inscrever', async (c) => {
  const programaId = c.req.param('id');
  try {
    const perfil = await strapiGet<{ data: any }>('/perfis/me');
    const perfilId = perfil.data.id;

    const existing = await strapiGet<any>('/inscricoes-programas', {
      'filters[perfil][id][$eq]': perfilId,
      'filters[programa][id][$eq]': String(programaId)
    });

    if (existing.data.length > 0) {
      return c.json({ error: 'Já estás inscrito neste programa' }, 409);
    }

    const result = await strapiPost<any>('/inscricoes-programas', {
      programa: programaId,
      perfil: perfilId,
      dataInscricao: new Date().toISOString()
    });

    return c.json(result, 201);
  } catch (err) {
    return c.json({ error: 'Erro ao processar inscrição' }, 502);
  }
});

/**
 * PUT /programas/:id (Elite Merge)
 * Resolve o Ticket T7: Não sobrescrever metadados cegamente.
 */
programaRoutes.put('/:id', checkRole(['instituicao', 'super_admin']), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  try {
    const existing = await strapiGet<{ data: any }>(`/programas/${id}`);
    
    // Deep Merge de metadados se existirem no body
    const metadata = {
      ...(existing.data.metadata || {}),
      ...(body.metadata || {})
    };

    const result = await strapiPut<any>(`/programas/${id}`, {
      ...body,
      metadata
    });

    return c.json(result);
  } catch (err) {
    return c.json({ error: 'Erro ao atualizar programa' }, 502);
  }
});
