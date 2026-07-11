import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import pino from 'pino';
import { UpdatePerfilPayloadSchema, DomainEventName, type UpdatePerfilPayload } from '@pdc/shared';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPut, strapiPutRaw } from '../modules/strapi/strapi.client.js';
import { serializePublicProfile, serializePrivateProfile, toStrapiPerfil, type StrapiPerfil } from '../modules/perfil/perfil.serializer.js';
import { getTier } from '../modules/reputation/reputation.service.js';
import { eventBus } from '../modules/events/event-bus.js';

const log = pino({ name: 'perfis-routes' });

type Vars = { Variables: AuthVariables };

interface StrapiVinculo {
  id: string | number;
  status?: string;
  solicitante?: { userId?: string; id?: string | number };
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

const STRAPI_PAYLOAD_FIELDS = [
  'nome',
  'bio',
  'headline',
  'regiao',
  'telefone',
  'website',
  'areasInteresse',
  'competencias',
  'socialLinks',
  'historicoProfissional',
  'formacaoAcademica',
  'notificationPreferences',
  'visibilitySettings',
  'avatarUrl',
  'bannerUrl',
] as const satisfies readonly (keyof UpdatePerfilPayload)[];

export type PerfilStrapiPayload = Partial<Pick<UpdatePerfilPayload, (typeof STRAPI_PAYLOAD_FIELDS)[number]>>;

export function buildPerfilStrapiPayload(body: UpdatePerfilPayload): PerfilStrapiPayload {
  const payload: PerfilStrapiPayload = {};

  for (const key of STRAPI_PAYLOAD_FIELDS) {
    const value = body[key];
    if (value !== undefined) {
      (payload as Record<string, unknown>)[key] = value;
    }
  }

  return payload;
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
      populate: 'foto,capa,conquistas',
    });
    
    if (res.data.length > 0) {
      const p = res.data[0];
      if (p) {
        p.reputacaoTier = getTier(p.reputacao ?? 0);
        return c.json(serializePrivateProfile(p));
      }
    }

    return c.json({ error: 'Perfil não encontrado' }, 404);
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
  const strapiPayload = buildPerfilStrapiPayload(body);
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
      const resPut = await strapiPut<StrapiPerfilRaw>(`/perfis/${docId}`, strapiPayload);
      
      // G15: Impacto no Ecossistema
      void eventBus.publishWithOutbox(DomainEventName.PERFIL_ATUALIZADO, {
        perfilId: String(perfil?.id),
        ...strapiPayload
      });

      return c.json(resPut.data);
    }

    // 2. Se não existe na coleção perfis, atualizar em users-permissions (legado/fallback)
    const data = await strapiPutRaw<unknown>(`/users/${id}`, strapiPayload);
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
      'filters[destinatario][userId][$eq]': userId,
      'filters[connectionType][$eq]': 'student-institution',
      'filters[status][$eq]': 'aprovado',
      'pagination[pageSize]': '100',
      populate: 'solicitante',
    });

    const studentIds = resVinculos.data
      .map((v) => v.solicitante?.userId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    if (studentIds.length === 0) {
      return c.json({ data: [] });
    }
    const userIdFilters = Object.fromEntries(
      studentIds.map((studentId, index) => [`filters[userId][$in][${String(index)}]`, studentId]),
    );
    const perfis = await strapiGet<StrapiPerfilRaw>('/perfis', {
      ...userIdFilters,
      populate: 'foto,capa,conquistas',
      'pagination[pageSize]': String(studentIds.length),
    });

    return c.json({
      data: perfis.data.map((perfil) => serializePublicProfile(toStrapiPerfil(perfil), true)),
    });
  } catch (err) {
    const message = (err as Error).message || 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /perfis/:id — perfil público V2 field-filtered
perfilRoutes.get('/:id', async (c) => {
  const userId = c.req.param('id');
  const requester = c.get('user');
  const requesterId = requester.id;

  try {
    const resRaw = await strapiGet<StrapiPerfilRaw>('/perfis', {
      'filters[userId][$eq]': userId,
      'pagination[pageSize]': '1',
      populate: 'foto,capa,conquistas',
    });
    const first = resRaw.data[0];
    if (!first) return c.json({ error: 'Perfil não encontrado' }, 404);

    let isConnected = false;
    if (requesterId && requesterId !== userId) {
      try {
        const [r1, r2] = await Promise.all([
          strapiGet<StrapiVinculo>('/vinculos', {
            'filters[solicitante][userId][$eq]': requesterId,
            'filters[destinatario][userId][$eq]': userId,
            'filters[status][$eq]': 'aprovado',
            'pagination[limit]': '1',
          }),
          strapiGet<StrapiVinculo>('/vinculos', {
            'filters[solicitante][userId][$eq]': userId,
            'filters[destinatario][userId][$eq]': requesterId,
            'filters[status][$eq]': 'aprovado',
            'pagination[limit]': '1',
          }),
        ]);
        isConnected = r1.data.length > 0 || r2.data.length > 0;
      } catch (err) {
        log.warn({ err, userId, requesterId }, 'vinculos lookup failed — isConnected defaults to false');
      }
    }

    const profileData = toStrapiPerfil(first);
    profileData.reputacaoTier = getTier(profileData.reputacao ?? 0);
    return c.json({ data: serializePublicProfile(profileData, isConnected) });
  } catch (err) {
    const message = (err as Error).message || 'Erro interno';
    return c.json({ error: message }, 502);
  }
});
