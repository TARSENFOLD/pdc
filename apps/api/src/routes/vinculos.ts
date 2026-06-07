import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import pino from 'pino';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';

const log = pino({ name: 'routes:vinculos' });
type Vars = { Variables: AuthVariables };
export const vinculoRoutes = new Hono<Vars>();

vinculoRoutes.use('*', verifyJwt);

interface StrapiPerfilMini {
  id: string | number;
  documentId?: string;
  nome: string;
  userId: string;
  tipo?: string;
  bio?: string;
  headline?: string;
  avatarUrl?: string | null;
  foto?: { url?: string } | null;
}

interface StrapiVinculo {
  id: string | number;
  solicitante: StrapiPerfilMini;
  destinatario: StrapiPerfilMini;
  status: string;
  criadoEm: string;
}

// GET /vinculos
vinculoRoutes.get('/', async (c) => {
  const { id: userId } = c.get('user');
  try {
    const res = await strapiGet<StrapiVinculo>('/vinculos', {
      'filters[$or][0][solicitante][userId][$eq]': userId,
      'filters[$or][1][destinatario][userId][$eq]': userId,
      'filters[status][$eq]': 'aprovado',
      populate: 'solicitante,destinatario'
    });
    return c.json({ data: res.data, meta: res.meta });
  } catch (err) {
    log.error({ err }, 'Erro ao carregar vínculos');
    return c.json({ error: 'Erro ao carregar vínculos' }, 502);
  }
});

// GET /vinculos/pendentes
vinculoRoutes.get('/pendentes', async (c) => {
  const { id: userId } = c.get('user');
  try {
    const res = await strapiGet<StrapiVinculo>('/vinculos', {
      'filters[destinatario][userId][$eq]': userId,
      'filters[status][$eq]': 'pendente',
      populate: 'solicitante'
    });
    return c.json({ data: res.data, meta: res.meta });
  } catch (err) {
    log.error({ err }, 'Erro ao carregar pedidos pendentes');
    return c.json({ error: 'Erro ao carregar pedidos pendentes' }, 502);
  }
});

// GET /vinculos/sugestoes
vinculoRoutes.get('/sugestoes', async (c) => {
  const { id: userId } = c.get('user');
  try {
    const [perfis, vinculos] = await Promise.all([
      strapiGet<StrapiPerfilMini>('/perfis', {
        'filters[userId][$ne]': userId,
        'filters[ativo][$eq]': 'true',
        'pagination[pageSize]': '20',
        populate: 'foto',
        sort: 'createdAt:desc',
      }),
      strapiGet<StrapiVinculo>('/vinculos', {
        'filters[$or][0][solicitante][userId][$eq]': userId,
        'filters[$or][1][destinatario][userId][$eq]': userId,
        'filters[status][$in][0]': 'pendente',
        'filters[status][$in][1]': 'aprovado',
        'pagination[pageSize]': '100',
        populate: 'solicitante,destinatario',
      }),
    ]);

    const excluded = new Set<string>();
    for (const vinculo of vinculos.data) {
      excluded.add(String(vinculo.solicitante.id));
      excluded.add(String(vinculo.destinatario.id));
    }

    const data = perfis.data
      .filter((perfil) => !excluded.has(String(perfil.id)))
      .slice(0, 5)
      .map((perfil) => ({
        id: String(perfil.id),
        nome: perfil.nome,
        role: perfil.tipo ?? 'estudante',
        bio: perfil.bio,
        headline: perfil.headline,
        avatarUrl: perfil.foto?.url ?? perfil.avatarUrl ?? null,
        reputacaoTier: 'BRONZE',
        areasInteresse: [],
        socialLinks: [],
      }));

    return c.json({ data });
  } catch (err) {
    log.error({ err, userId }, 'Erro ao carregar sugestões de vínculo');
    return c.json({ error: 'Erro ao carregar sugestões de vínculo' }, 502);
  }
});

// GET /vinculos/partilha — destinos internos autorizados
vinculoRoutes.get('/partilha', async (c) => {
  const { id: userId } = c.get('user');
  try {
    const res = await strapiGet<StrapiVinculo>('/vinculos', {
      'filters[$or][0][solicitante][userId][$eq]': userId,
      'filters[$or][1][destinatario][userId][$eq]': userId,
      'filters[status][$eq]': 'aprovado',
      'pagination[pageSize]': '100',
      populate: 'solicitante.foto,destinatario.foto',
    });
    const data = res.data.map((vinculo) => {
      const perfil = vinculo.solicitante.userId === userId
        ? vinculo.destinatario
        : vinculo.solicitante;
      return {
        id: String(perfil.id),
        userId: perfil.userId,
        nome: perfil.nome,
        avatarUrl: perfil.foto?.url ?? perfil.avatarUrl ?? null,
      };
    });
    return c.json({ data });
  } catch (err) {
    log.error({ err, userId }, 'Erro ao carregar destinos de partilha');
    return c.json({ error: 'Erro ao carregar destinos de partilha' }, 502);
  }
});

// POST /vinculos/:id/pedir
vinculoRoutes.post('/:id/pedir', async (c) => {
  const destinatarioPerfilId = c.req.param('id');
  const { id: userId } = c.get('user');

  try {
    const solicitanteRes = await strapiGet<StrapiPerfilMini>('/perfis', {
      'filters[userId][$eq]': userId,
      'pagination[pageSize]': '1',
    });
    const solicitantePerfil = solicitanteRes.data[0];

    if (!solicitantePerfil) {
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

    const resPost = await strapiPost<StrapiVinculo>('/vinculos', {
      solicitante: solicitantePerfil.documentId ?? solicitantePerfil.id,
      destinatario: destinatarioPerfilId,
      status: 'pendente',
      criadoEm: new Date().toISOString()
    });

    // G15: Impacto no Ecossistema
    await eventBus.publishWithOutbox(DomainEventName.VINCULO_SOLICITADO, {
      vinculoId: resPost.data.id,
      solicitanteId: String(solicitantePerfil.id),
      destinatarioId: destinatarioPerfilId
    });

    return c.json(resPost.data, 201);
  } catch (err) {
    log.error({ err }, 'Erro ao processar pedido de vínculo');
    return c.json({ error: 'Erro ao processar pedido de vínculo' }, 502);
  }
});

// PATCH /vinculos/:id/resolver
vinculoRoutes.patch('/:id/resolver', zValidator('json', z.object({ status: z.enum(['aprovado', 'rejeitado']) })), async (c) => {
  const vinculoId = c.req.param('id');
  const { status } = c.req.valid('json');
  const { id: userId } = c.get('user');

  try {
    const resExisting = await strapiGet<StrapiVinculo>(`/vinculos/${vinculoId}`, { populate: 'solicitante,destinatario' });
    const existing = resExisting.data[0];

    if (!existing) {
      return c.json({ error: 'Vínculo não encontrado' }, 404);
    }
    
    if (existing.destinatario.userId !== userId) {
      return c.json({ error: 'Não tens permissão para resolver este vínculo' }, 403);
    }

    const resPut = await strapiPut<StrapiVinculo>(`/vinculos/${vinculoId}`, { 
      status,
      resolvidoEm: new Date().toISOString()
    });

    // G15: Impacto no Ecossistema
    if (status === 'aprovado') {
      await eventBus.publishWithOutbox(DomainEventName.VINCULO_APROVADO, {
        vinculoId,
        solicitanteId: String(existing.solicitante.id),
        destinatarioId: String(existing.destinatario.id)
      });
    } else {
      await eventBus.publishWithOutbox(DomainEventName.VINCULO_REJEITADO, {
        vinculoId,
        solicitanteId: String(existing.solicitante.id),
        destinatarioId: String(existing.destinatario.id)
      });
    }

    return c.json(resPut.data);
  } catch (err) {
    log.error({ err }, 'Erro ao resolver vínculo');
    return c.json({ error: 'Erro ao resolver vínculo' }, 502);
  }
});
