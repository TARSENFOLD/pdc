import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { UpdatePerfilPayloadSchema, DomainEventName } from '@pdc/shared';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPut, strapiPutRaw } from '../modules/strapi/strapi.client.js';
import { serializePublicProfile, serializePrivateProfile, type StrapiPerfil } from '../modules/perfil/perfil.serializer.js';
import * as featureFlagService from '../modules/feature-flags/feature-flags.service.js';
import { getTier } from '../modules/reputation/reputation.service.js';
import { eventBus } from '../modules/events/event-bus.js';

type Vars = { Variables: AuthVariables };

interface StrapiVinculo {
  id: string | number;
  senderId?: string;
  receiverId?: string;
}

interface StrapiPerfilRaw {
  id: string | number;
  documentId?: string;
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
    // Buscar perfil real do Strapi v5 (coleção perfis)
    const res = await strapiGet<StrapiPerfil>('/perfis', {
      'filters[userId][$eq]': id,
      populate: 'foto,conquistas',
    });
    
    if (res.data.length > 0) {
      const p = res.data[0];
      if (p) {
        p.reputacaoTier = getTier(p.reputacao ?? 0);
        return c.json(serializePrivateProfile(p));
      }
    }

    // Fallback: buscar utilizador base (Mudar para lançar 404 futuramente se perfil for obrigatório)
    const data = await strapiGet<StrapiPerfilRaw>(`/users/${id}`, {
      populate: 'role,avatar',
    });
    return c.json(data.data[0]);
  } catch (err) {
    const message = (err as Error).message || 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// PUT /perfis/me
perfilRoutes.put('/me', zValidator('json', UpdatePerfilPayloadSchema), async (c) => {
  const user = c.get('user');
  const id = user.id;
  const body = c.req.valid('json');
  try {
    // 1. Tentar encontrar perfil na coleção 'perfis'
    const resGet = await strapiGet<StrapiPerfilRaw>('/perfis', {
      'filters[userId][$eq]': id,
      'fields[0]': 'id',
      'fields[1]': 'documentId'
    });

    if (resGet.data.length > 0) {
      const perfil = resGet.data[0];
      const docId = perfil?.documentId || String(perfil?.id);
      const resPut = await strapiPut<StrapiPerfilRaw>(`/perfis/${docId}`, body);
      
      // G15: Impacto no Ecossistema
      void eventBus.publishWithOutbox(DomainEventName.PERFIL_ATUALIZADO, {
        perfilId: String(perfil?.id),
        ...body
      });

      return c.json(resPut.data);
    }

    // 2. Se não existe na coleção perfis, atualizar em users-permissions (legado/fallback)
    const data = await strapiPutRaw<unknown>(`/users/${id}`, body);
    return c.json(data);
  } catch (err) {
    const message = (err as Error).message || 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /perfis/me/stats — dashboard estudante stats
perfilRoutes.get('/me/stats', checkRole(['estudante']), async (c) => {
  const user = c.get('user');
  const id = user.id;
  try {
    const [telemetria, inscricoes, conquistas] = await Promise.all([
      strapiGet<unknown>('/telemetrias', {
        'filters[userId][$eq]': id,
        'filters[tipo][$eq]': 'simulacao.completed',
        'pagination[pageSize]': '1',
      }),
      strapiGet<unknown>('/inscricoes', {
        'filters[estudanteId][$eq]': id,
        'filters[concluido][$eq]': 'false',
        'pagination[pageSize]': '1',
      }),
      strapiGet<unknown>('/conquistas', {
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
    const message = (err as Error).message || 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /perfis/estudantes-vinculados — estudantes conectados à instituição
perfilRoutes.get('/estudantes-vinculados', checkRole(['instituicao', 'super_admin']), async (c) => {
  const { id: userId } = c.get('user');
  try {
    const resVinculos = await strapiGet<StrapiVinculo>('/vinculos', {
      'filters[receiverId][$eq]': userId,
      'filters[connectionType][$eq]': 'student-institution',
      'filters[estado][$eq]': 'connected',
      'pagination[pageSize]': '100',
    });

    const studentIds = resVinculos.data.map((v) => v.senderId).filter(Boolean) as string[];
    if (studentIds.length === 0) {
      return c.json({ data: [] });
    }
    const students = await Promise.all(
      studentIds.map((sid) =>
        strapiGet<StrapiPerfilRaw>(`/users/${sid}`, { populate: 'role,avatar' })
      )
    );
    return c.json({ data: students.map(s => s.data[0]) });
  } catch (err) {
    const message = (err as Error).message || 'Erro interno';
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
      const resRaw = await strapiGet<StrapiPerfilRaw>('/perfis', {
        'filters[userId][$eq]': userId,
        'pagination[pageSize]': '1',
        populate: 'foto',
      });
      const first = resRaw.data[0];
      if (!first) return c.json({ error: 'Perfil não encontrado' }, 404);

      let isConnected = false;
      if (requesterId && requesterId !== userId) {
        try {
          const resVinculos = await strapiGet<StrapiVinculo>('/vinculos', {
            'filters[senderId][$eq]': requesterId,
            'filters[receiverId][$eq]': userId,
            'filters[estado][$eq]': 'connected',
            'pagination[pageSize]': '1',
          });
          isConnected = resVinculos.data.length > 0;
        } catch { /* ignore vinculos fail */ }
      }

      const profileData = first as unknown as StrapiPerfil;
      profileData.reputacaoTier = getTier(profileData.reputacao ?? 0);
      return c.json({ data: serializePublicProfile(profileData, isConnected) });
    }

    const resUser = await strapiGet<unknown>(`/users/${userId}`, {
      populate: 'role,avatar',
    });
    return c.json(resUser.data[0]);
  } catch (err) {
    const message = (err as Error).message || 'Erro interno';
    return c.json({ error: message }, 502);
  }
});
