import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { UpdatePerfilPayloadSchema } from '@pdc/shared';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPutRaw } from '../modules/strapi/strapi.client.js';
import { serializePublicProfile, type StrapiPerfil } from '../modules/perfil/perfil.serializer.js';
import * as featureFlagService from '../modules/feature-flags/feature-flags.service.js';

type Vars = { Variables: AuthVariables };

interface VinculoData {
  senderId?: string;
  receiverId?: string;
  attributes?: { senderId?: string; receiverId?: string };
}

interface VinculosResponse {
  data: VinculoData[];
}

interface StrapiPerfilRaw {
  id: string | number;
  nome?: string;
  tipo?: string;
  bio?: string;
  headline?: string;
  telefone?: string;
  website?: string;
  socialLinks?: unknown;
  areasInteresse?: unknown;
  competencias?: unknown;
  avatarUrl?: string;
  foto?: { url?: string } | null;
  visibilitySettings?: Record<string, string> | null;
  [key: string]: unknown;
}

export const perfilRoutes = new Hono<Vars>();

perfilRoutes.use('*', verifyJwt);

// GET /perfis/me
perfilRoutes.get('/me', async (c) => {
  const user = c.get('user');
  const id = user.id;
  try {
    const data = await strapiGet<unknown>(`/users/${id}`, {
      populate: 'role,avatar',
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// PUT /perfis/me
perfilRoutes.put('/me', zValidator('json', UpdatePerfilPayloadSchema), async (c) => {
  const user = c.get('user');
  const id = user.id;
  const body = c.req.valid('json');
  try {
    const data = await strapiPutRaw<unknown>(`/users/${id}`, body);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /perfis/me/stats — dashboard aluno stats
perfilRoutes.get('/me/stats', checkRole(['aluno']), async (c) => {
  const user = c.get('user');
  const id = user.id;
  try {
    const [telemetria, inscricoes, conquistas] = await Promise.all([
      strapiGet<{ meta: { pagination: { total: number } } }>('/telemetrias', {
        'filters[userId][$eq]': id,
        'filters[tipo][$eq]': 'simulacao.completed',
        'pagination[pageSize]': '1',
      }),
      strapiGet<{ meta: { pagination: { total: number } } }>('/inscricoes', {
        'filters[alunoId][$eq]': id,
        'filters[concluido][$eq]': 'false',
        'pagination[pageSize]': '1',
      }),
      strapiGet<{ meta: { pagination: { total: number } } }>('/conquistas', {
        'filters[userId][$eq]': id,
        'filters[desbloqueada][$eq]': 'true',
        'pagination[pageSize]': '1',
      }),
    ]);
    return c.json({
      simulacoesConcluidas: telemetria.meta.pagination.total,
      cursosEmProgresso: inscricoes.meta.pagination.total,
      conquistasTotal: conquistas.meta.pagination.total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /perfis/estudantes-vinculados — estudantes conectados à instituição
perfilRoutes.get('/estudantes-vinculados', checkRole(['instituicao', 'super_admin']), async (c) => {
  const { id: userId } = c.get('user');
  try {
    const vinculos = await strapiGet<VinculosResponse>('/vinculos', {
      'filters[receiverId][$eq]': userId,
      'filters[connectionType][$eq]': 'student-institution',
      'filters[estado][$eq]': 'connected',
      'pagination[pageSize]': '100',
    });
    const studentIds = vinculos.data.map((v) => v.attributes?.senderId ?? v.senderId).filter(Boolean) as string[];
    if (studentIds.length === 0) {
      return c.json({ data: [] });
    }
    const students = await Promise.all(
      studentIds.map((sid) =>
        strapiGet<unknown>(`/users/${sid}`, { populate: 'role,avatar' })
      )
    );
    return c.json({ data: students });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /perfis/:id — perfil público (respeita PROFILE_V2_PUBLIC + visibilitySettings)
perfilRoutes.get('/:id', async (c) => {
  const userId = c.req.param('id');
  const requesterId = c.get('user').id;

  let useV2 = false;
  try {
    const flags = await featureFlagService.getEffectiveFlags();
    useV2 = flags['PROFILE_V2_PUBLIC'] === true;
  } catch { /* ignore */ }

  try {
    if (useV2) {
      const raw = await strapiGet<{ data: StrapiPerfilRaw[] }>('/perfis', {
        'filters[userId][$eq]': userId,
        'pagination[pageSize]': '1',
        populate: 'foto',
      });
      const first = raw.data[0];
      if (!first) return c.json({ error: 'Perfil não encontrado' }, 404);

      let isConnected = false;
      if (requesterId && requesterId !== userId) {
        try {
          const vinculos = await strapiGet<VinculosResponse>('/vinculos', {
            'filters[senderId][$eq]': requesterId,
            'filters[receiverId][$eq]': userId,
            'filters[estado][$eq]': 'connected',
            'pagination[pageSize]': '1',
          });
          isConnected = vinculos.data.length > 0;
        } catch { /* ignore vinculos fail */ }
      }

      const profileData = first as unknown as StrapiPerfil;
      return c.json({ data: serializePublicProfile(profileData, isConnected) });
    }

    const data = await strapiGet<unknown>(`/users/${userId}`, {
      populate: 'role,avatar',
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});
