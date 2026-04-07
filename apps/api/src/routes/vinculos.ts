import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import type {
  VinculoTipo,
  VinculoEstado,
  VinculoStatus,
} from '@pdc/shared';
import {
  CriarVinculoPayloadSchema,
  AceitarRejeitarVinculoPayloadSchema,
} from '@pdc/shared';

export const vinculoRoutes = new Hono<{ Variables: AuthVariables }>();

// ─── Strapi Shapes ───────────────────────────────────────────────────────────

interface StrapiVinculo {
  id: string;
  senderId: string;
  receiverId: string;
  connectionType: VinculoTipo;
  estado: VinculoEstado;
  createdAt: string;
  updatedAt: string;
}

interface StrapiPerfil {
  id: string;
  nome: string;
  avatarUrl?: string;
  bio?: string;
  role: string;
}

interface StrapiListResponse<T> {
  data: T[];
  meta: { pagination: { total: number } };
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const statusQuerySchema = z.object({
  targetId: z.string().min(1),
});

const meusQuerySchema = z.object({
  tipo: z.enum(['student-student', 'student-mentor', 'student-institution', 'mentor-institution']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// ─── Rotas ────────────────────────────────────────────────────────────────────

vinculoRoutes.use('*', verifyJwt);

// POST /vinculos
vinculoRoutes.post('/', zValidator('json', CriarVinculoPayloadSchema), async (c) => {
  const { id: senderId } = c.get('user');
  const { receiverId, connectionType } = c.req.valid('json');

  if (senderId === receiverId) {
    return c.json({ error: 'Não te podes vincular a ti mesmo' }, 400);
  }

  try {
    // Verificar se já existe vínculo
    const existing = await strapiGet<StrapiListResponse<StrapiVinculo>>('/vinculos', {
      'filters[$or][0][senderId][$eq]': senderId,
      'filters[$or][0][receiverId][$eq]': receiverId,
      'filters[$or][1][senderId][$eq]': receiverId,
      'filters[$or][1][receiverId][$eq]': senderId,
      'pagination[pageSize]': '1',
      sort: 'updatedAt:desc',
    });

    if (existing.data && existing.data.length > 0) {
      const existingVinculo = existing.data[0];

      if (existingVinculo && existingVinculo.estado === 'declined') {
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
      } else if (existingVinculo) {
        return c.json({ error: 'Vínculo já existe' }, 409);
      }
    }

    const result = await strapiPost<StrapiVinculo>('/vinculos', {
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
    const data = await strapiGet<StrapiListResponse<StrapiVinculo>>('/vinculos', {
      'filters[$or][0][senderId][$eq]': userId,
      'filters[$or][0][receiverId][$eq]': targetId,
      'filters[$or][1][senderId][$eq]': targetId,
      'filters[$or][1][receiverId][$eq]': userId,
      'pagination[pageSize]': '1',
    });

    if (!data.data || data.data.length === 0) {
      const emptyRes: VinculoStatus = { estado: null, vinculoId: null, isSender: false };
      return c.json(emptyRes);
    }

    const v = data.data[0];
    if (!v) {
      const emptyRes: VinculoStatus = { estado: null, vinculoId: null, isSender: false };
      return c.json(emptyRes);
    }

    const res: VinculoStatus = {
      estado: v.estado,
      vinculoId: v.id,
      isSender: v.senderId === userId,
    };
    return c.json(res);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// GET /vinculos/pendentes
vinculoRoutes.get('/pendentes', async (c) => {
  const { id: userId } = c.get('user');

  try {
    const data = await strapiGet<StrapiListResponse<StrapiVinculo>>('/vinculos', {
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
      'pagination[page]': (page || 1).toString(),
      'pagination[pageSize]': (pageSize || 20).toString(),
      populate: 'sender,receiver',
      sort: 'createdAt:desc',
    };

    if (tipo) params['filters[connectionType][$eq]'] = tipo;

    const data = await strapiGet<StrapiListResponse<StrapiVinculo>>('/vinculos', params);
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
    const v = await strapiGet<{ data: StrapiVinculo | null }>(`/vinculos/${id}`);
    if (!v.data || v.data.receiverId !== userId) {
      return c.json({ error: 'Acesso negado' }, 403);
    }

    const newEstado = acao === 'aceitar' ? 'connected' : 'declined';
    const result = await strapiPut<StrapiVinculo>(`/vinculos/${id}`, { estado: newEstado });
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
    const v = await strapiGet<{ data: StrapiVinculo | null }>(`/vinculos/${id}`);
    if (!v.data || (v.data.senderId !== userId && v.data.receiverId !== userId)) {
      return c.json({ error: 'Acesso negado' }, 403);
    }

    // Remover vínculo
    await strapiPut<unknown>(`/vinculos/${id}`, { estado: 'declined' });
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
    const existingVinculos = await strapiGet<StrapiListResponse<StrapiVinculo>>('/vinculos', {
      'filters[$or][0][senderId][$eq]': userId,
      'filters[$or][1][receiverId][$eq]': userId,
      'pagination[pageSize]': '100',
    });

    const excludeIds = new Set<string>([userId]);
    if (existingVinculos.data) {
      for (const v of existingVinculos.data) {
        if (v) {
          excludeIds.add(v.senderId);
          excludeIds.add(v.receiverId);
        }
      }
    }

    // Buscar perfis sugeridos (exclui os já vinculados)
    const perfis = await strapiGet<StrapiListResponse<StrapiPerfil>>('/perfis', {
      'pagination[pageSize]': '20',
      fields: 'id,nome,avatarUrl,bio,role',
    });

    const sugestoes = (perfis.data || [])
      .filter((p: StrapiPerfil) => p && !excludeIds.has(p.id))
      .slice(0, 10);

    return c.json({ data: sugestoes });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});
