import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { CriarVinculoPayloadSchema, AceitarRejeitarVinculoPayloadSchema, VinculoTipoSchema } from '@pdc/shared';

type Vars = { Variables: AuthVariables };

const statusQuerySchema = z.object({
  targetId: z.string().min(1),
});

const meusQuerySchema = z.object({
  tipo: VinculoTipoSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const vinculoRoutes = new Hono<Vars>();

vinculoRoutes.use('*', verifyJwt);

// POST /vinculos
vinculoRoutes.post('/', zValidator('json', CriarVinculoPayloadSchema), async (c) => {
  const { id: senderId } = c.get('user');
  const { receiverId, connectionType } = c.req.valid('json');

  try {
    if (senderId === receiverId) {
      return c.json({ error: 'Não podes enviar vínculo para ti próprio' }, 400);
    }

    // Verificar se já existe vínculo
    const existing = await strapiGet<any>('/vinculos', {
      'filters[$or][0][senderId][$eq]': senderId,
      'filters[$or][0][receiverId][$eq]': receiverId,
      'filters[$or][1][senderId][$eq]': receiverId,
      'filters[$or][1][receiverId][$eq]': senderId,
      'pagination[pageSize]': '1',
      sort: 'updatedAt:desc',
    });

    if (existing.data && existing.data.length > 0) {
      const existingVinculo = existing.data[0] as { estado: string; updatedAt: string };

      if (existingVinculo.estado === 'declined') {
        const daysSinceDecline =
          (Date.now() - new Date(existingVinculo.updatedAt).getTime()) /
          (1000 * 60 * 60 * 24);

        if (daysSinceDecline < 30) {
          return c.json(
            { error: 'Aguarda 30 dias antes de enviar novo pedido de vínculo.' },
            429
          );
        }
        // Cooldown passed — fall through to create new vínculo
      } else {
        return c.json({ error: 'Vínculo já existe' }, 409);
      }
    }

    const result = await strapiPost<any>('/vinculos', {
      senderId,
      receiverId,
      connectionType,
      estado: 'pending',
    });

    return c.json(result, 201);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// GET /vinculos/status?targetId=X
vinculoRoutes.get('/status', zValidator('query', statusQuerySchema), async (c) => {
  const { id: userId } = c.get('user');
  const { targetId } = c.req.valid('query');

  try {
    const data = await strapiGet<any>('/vinculos', {
      'filters[$or][0][senderId][$eq]': userId,
      'filters[$or][0][receiverId][$eq]': targetId,
      'filters[$or][1][senderId][$eq]': targetId,
      'filters[$or][1][receiverId][$eq]': userId,
      'pagination[pageSize]': '1',
    });

    if (!data.data || data.data.length === 0) {
      return c.json({ estado: null, vinculoId: null, isSender: false });
    }

    const v = data.data[0];
    return c.json({
      estado: v.estado,
      vinculoId: v.id,
      isSender: v.senderId === userId,
    });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// GET /vinculos/pendentes
vinculoRoutes.get('/pendentes', async (c) => {
  const { id: userId } = c.get('user');

  try {
    const data = await strapiGet<any>('/vinculos', {
      'filters[receiverId][$eq]': userId,
      'filters[estado][$eq]': 'pending',
      populate: 'sender,receiver',
      sort: 'createdAt:desc',
    });

    return c.json(data);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// GET /vinculos/meus
vinculoRoutes.get('/meus', zValidator('query', meusQuerySchema), async (c) => {
  const { id: userId } = c.get('user');
  const { tipo, page, pageSize } = c.req.valid('query');

  try {
    const params: Record<string, string> = {
      'filters[$or][0][senderId][$eq]': userId,
      'filters[$or][1][receiverId][$eq]': userId,
      'filters[estado][$eq]': 'connected',
      'pagination[page]': page.toString(),
      'pagination[pageSize]': pageSize.toString(),
      populate: 'sender,receiver',
      sort: 'createdAt:desc',
    };

    if (tipo) params['filters[connectionType][$eq]'] = tipo;

    const data = await strapiGet<any>('/vinculos', params);
    return c.json(data);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// PATCH /vinculos/:id
vinculoRoutes.patch('/:id', zValidator('json', AceitarRejeitarVinculoPayloadSchema), async (c) => {
  const id = c.req.param('id');
  const { acao } = c.req.valid('json');
  const { id: userId } = c.get('user');

  try {
    const v = await strapiGet<any>(`/vinculos/${id}`);
    if (!v.data || v.data.receiverId !== userId) {
      return c.json({ error: 'Acesso negado' }, 403);
    }

    const newEstado = acao === 'aceitar' ? 'connected' : 'declined';
    const result = await strapiPut<any>(`/vinculos/${id}`, { estado: newEstado });
    return c.json(result);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// DELETE /vinculos/:id
vinculoRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const { id: userId } = c.get('user');

  try {
    const v = await strapiGet<any>(`/vinculos/${id}`);
    if (!v.data || (v.data.senderId !== userId && v.data.receiverId !== userId)) {
      return c.json({ error: 'Acesso negado' }, 403);
    }

    // Remover vínculo
    await strapiPut<any>(`/vinculos/${id}`, { estado: 'declined' });
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// GET /vinculos/sugestoes
vinculoRoutes.get('/sugestoes', async (c) => {
  const { id: userId } = c.get('user');

  try {
    // Buscar vínculos existentes para excluir
    const existingVinculos = await strapiGet<any>('/vinculos', {
      'filters[$or][0][senderId][$eq]': userId,
      'filters[$or][1][receiverId][$eq]': userId,
      'pagination[pageSize]': '100',
    });

    const excludeIds = new Set<string>([userId]);
    if (existingVinculos.data) {
      for (const v of existingVinculos.data) {
        excludeIds.add(v.senderId);
        excludeIds.add(v.receiverId);
      }
    }

    // Buscar perfis sugeridos (exclui os já vinculados)
    const perfis = await strapiGet<any>('/perfis', {
      'pagination[pageSize]': '20',
      fields: 'id,nome,avatarUrl,bio,role',
    });

    const sugestoes = (perfis.data || [])
      .filter((p: any) => !excludeIds.has(p.id))
      .slice(0, 10);

    return c.json({ data: sugestoes });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

