import { Hono } from 'hono';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import {
  findStrapiEntity,
  persistedEntityId,
  type StrapiEntityReference,
} from '../modules/strapi/strapi-entity.js';
import { toPaginatedResponse } from './pagination.js';

const DeviceTokenSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(['ios', 'android', 'web']),
  endpoint: z.string().url().optional(),
  p256dh: z.string().optional(),
  auth: z.string().optional(),
});

type Vars = { Variables: AuthVariables };

export const notificacaoRoutes = new Hono<Vars>();

notificacaoRoutes.use('*', verifyJwt);

// GET /notificacoes — lista notificações do utilizador autenticado
notificacaoRoutes.get('/', async (c) => {
  const { id } = c.get('user');
  try {
    const data = await strapiGet<unknown>('/notificacoes', {
      'filters[userId][$eq]': id,
      'sort': 'createdAt:desc',
      'pagination[pageSize]': '50',
    });
    return c.json(toPaginatedResponse(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /notificacoes/agrupadas — notificações agrupadas por tipo com contagem
notificacaoRoutes.get('/agrupadas', async (c) => {
  const { id } = c.get('user');
  try {
    const data = await strapiGet<{ tipo: string; lida: boolean }>('/notificacoes', {
      'filters[userId][$eq]': id,
      'fields[0]': 'tipo',
      'fields[1]': 'lida',
      'pagination[pageSize]': '500',
    });

    if (data.meta.pagination.total > data.data.length) {
      console.warn({ userId: id, total: data.meta.pagination.total, fetched: data.data.length }, 'Notificações agrupadas truncadas — contagem parcial');
    }

    const grupos: Record<string, { tipo: string; total: number; naoLidas: number }> = {};
    for (const item of data.data) {
      const tipo = item.tipo;
      if (!grupos[tipo]) grupos[tipo] = { tipo, total: 0, naoLidas: 0 };
      grupos[tipo].total += 1;
      if (!item.lida) grupos[tipo].naoLidas += 1;
    }

    return c.json({ agrupadas: Object.values(grupos) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /notificacoes/contador — contagem de não lidas
notificacaoRoutes.get('/contador', async (c) => {
  const { id } = c.get('user');
  try {
    const [all, unread] = await Promise.all([
      strapiGet<unknown>('/notificacoes', {
        'filters[userId][$eq]': id,
        'pagination[pageSize]': '1',
      }),
      strapiGet<unknown>('/notificacoes', {
        'filters[userId][$eq]': id,
        'filters[lida][$eq]': 'false',
        'pagination[pageSize]': '1',
      }),
    ]);
    return c.json({
      total: all.meta.pagination.total,
      naoLidas: unread.meta.pagination.total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// PUT /notificacoes/:id/lida — marcar como lida
notificacaoRoutes.put('/:id/lida', async (c) => {
  const notifId = c.req.param('id');
  const { id: userId } = c.get('user');
  try {
    const notificacao = await findStrapiEntity<StrapiEntityReference>(
      'notificacoes',
      notifId,
      { 'filters[userId][$eq]': userId },
    );
    if (!notificacao) {
      return c.json({ error: 'Notificação não encontrada' }, 404);
    }
    const data = await strapiPut<unknown>(
      `/notificacoes/${persistedEntityId(notificacao)}`,
      { lida: true },
    );
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// PUT /notificacoes/lidas/todas — marcar todas como lidas
notificacaoRoutes.put('/lidas/todas', async (c) => {
  const { id } = c.get('user');
  try {
    const data = await strapiPost<unknown>('/notificacoes/marcar-todas-lidas', { userId: id });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// POST /notificacoes/push/register — regista device token (iOS APNs / Android FCM / Web Push)
notificacaoRoutes.post('/push/register', async (c) => {
  const user = c.get('user');
  const perfilId = user.perfilId;
  if (!perfilId) {
    return c.json({ error: 'Perfil não associado ao utilizador' }, 400);
  }
  const body: unknown = await c.req.json().catch(() => null);
  const parsed = DeviceTokenSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Payload inválido', details: parsed.error.flatten() }, 400);
  }
  const { token, platform, endpoint, p256dh, auth } = parsed.data;
  try {
    const data = await strapiPost<unknown>('/device-tokens', {
      perfilId,
      token,
      platform,
      endpoint: endpoint ?? null,
      p256dh: p256dh ?? null,
      auth: auth ?? null,
      ultimoUso: new Date().toISOString(),
    });
    return c.json(data, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// DELETE /notificacoes/push/unregister — remove device token ao fazer logout
notificacaoRoutes.delete('/push/unregister', async (c) => {
  const { perfilId } = c.get('user');
  if (!perfilId) {
    return c.json({ error: 'Perfil não associado ao utilizador' }, 400);
  }
  const body: unknown = await c.req.json().catch(() => null);
  const parsed = z.object({ token: z.string().min(10) }).safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Token em falta' }, 400);
  }
  try {
    const existing = await strapiGet<Record<string, unknown>>('/device-tokens', {
      'filters[perfilId][$eq]': perfilId,
      'filters[token][$eq]': parsed.data.token,
      'pagination[pageSize]': '1',
    });
    const record = existing.data[0];
    if (!record) return c.json({ ok: true });
    await strapiPost<unknown>(`/device-tokens/${String(record.id)}/delete`, {});
    return c.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});
