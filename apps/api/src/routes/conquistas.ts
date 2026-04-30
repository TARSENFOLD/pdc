import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPost } from '../modules/strapi/strapi.client.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { verificarConquistas } from '../modules/conquistas/conquistas.engine.js';
import { CriarConquistaManualPayloadSchema } from '@pdc/shared';

type Vars = { Variables: AuthVariables };

const verificarSchema = z.object({
  evento: z.string().min(1, 'evento é obrigatório'),
  referencia: z.string().optional(),
});

export const conquistaRoutes = new Hono<Vars>();

conquistaRoutes.use('*', verifyJwt);

// GET /conquistas/minhas
conquistaRoutes.get('/minhas', async (c) => {
  const { id } = c.get('user');
  try {
    return c.json(
      await strapiGet<unknown>('/conquistas', {
        'filters[userId][$eq]': id,
        populate: 'conquista',
        'sort': 'createdAt:desc',
      })
    );
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// POST /conquistas/verificar — executa engine local de conquistas
conquistaRoutes.post('/verificar', zValidator('json', verificarSchema), async (c) => {
  const user = c.get('user');
  const { evento, referencia } = c.req.valid('json');
  try {
    const unlocked = await verificarConquistas(user.id, evento, referencia, user.instituicaoId);
    return c.json({ unlocked }, unlocked.length > 0 ? 201 : 200);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

interface StrapiConquistaRes {
  id: string;
  titulo: string;
  aprovada: boolean;
}

// POST /conquistas/manual — criar conquista manual (RBAC)
conquistaRoutes.post('/manual',
  checkRole(['estudante', 'mentor', 'instituicao', 'super_admin']),
  zValidator('json', CriarConquistaManualPayloadSchema),
  async (c) => {
    const body = c.req.valid('json');
    const { id: userId, role } = c.get('user');

    try {
      const resPerfil = await strapiGet<{ id: string; createdAt: string }>('/perfis', {
        'filters[userId][$eq]': userId,
        'fields[0]': 'id',
        'fields[1]': 'createdAt',
      });
      const perfil = resPerfil.data[0];

      if (!perfil) return c.json({ error: 'Perfil não encontrado' }, 404);

      // Auto-aprovação para autores ≥7 dias
      const createdAt = perfil.createdAt ? new Date(perfil.createdAt).getTime() : Date.now();
      const diasDesdeCriacao = Math.max(0, (Date.now() - createdAt) / (1000 * 60 * 60 * 24));
      const aprovada = diasDesdeCriacao >= 7;

      const res = await strapiPost<StrapiConquistaRes>('/conquistas', {
        ...body,
        origem: 'manual',
        tipo: 'manual',
        tipoAutor: role,
        autor: perfil.id,
        aprovada,
      });

      // G15: Sincronização Soberana de Mérito
      const publishedEvent = await eventBus.publishWithOutbox(DomainEventName.CONQUISTA_DESBLOQUEADA, {
        conquistaId: res.data.id,
        userId: userId,
        tipo: 'manual',
        titulo: body.titulo,
        aprovada
      });

      return c.json({
        ...res.data,
        eventId: publishedEvent.id
      }, 201);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);
