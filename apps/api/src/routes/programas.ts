import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet, strapiPut } from '../modules/strapi/strapi.client.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';

type Vars = { Variables: AuthVariables };
export const programaRoutes = new Hono<Vars>();

programaRoutes.use('*', verifyJwt);

interface StrapiPrograma {
  id: string;
  perfilId?: string;
  metadata?: unknown;
}

// GET /programas/meus
programaRoutes.get('/meus', async (c) => {
  const { id: userId } = c.get('user');
  
  try {
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
    });
    const perfilId = resPerfil.data[0]?.id;

    if (!perfilId) return c.json({ data: [] });

    const res = await strapiGet<StrapiPrograma>('/inscricoes-programas', {
      'filters[perfil][id][$eq]': String(perfilId),
      populate: 'programa',
    });

    return c.json(res);
  } catch (_err) {
    return c.json({ error: 'Erro ao carregar teus programas' }, 502);
  }
});

// POST /programas/:id/concluir
programaRoutes.post('/:id/concluir', async (c) => {
  const programaId = c.req.param('id');
  const { id: userId } = c.get('user');

  try {
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
    });
    const perfilId = resPerfil.data[0]?.id;

    const resInscr = await strapiGet<StrapiPrograma>('/inscricoes-programas', {
      'filters[perfil][id][$eq]': String(perfilId),
      'filters[programa][id][$eq]': programaId,
    });

    const existing = resInscr.data[0];
    if (!existing) return c.json({ error: 'Inscrição não encontrada' }, 404);

    await strapiPut(`/inscricoes-programas/${existing.id}`, {
      concluido: true,
      dataConclusao: new Date().toISOString(),
      metadata: {
        ...(existing.metadata || {}),
        concluidoVia: 'api',
      }
    });

    // G15: Impacto no Ecossistema
    await eventBus.publishWithOutbox(DomainEventName.PROGRAMA_CONCLUIDO, {
      programaId,
      perfilId: String(perfilId),
    });

    return c.json({ success: true });
  } catch (_err) {
    return c.json({ error: 'Erro ao concluir programa' }, 502);
  }
});
