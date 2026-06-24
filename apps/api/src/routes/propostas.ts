import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { requireAdult } from '../modules/auth/minor.guard.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { CriarPropostaPayloadSchema } from '@pdc/shared';

type Vars = { Variables: AuthVariables };
export const propostaRoutes = new Hono<Vars>();

propostaRoutes.use('*', verifyJwt);

// POST /propostas (Criar nova proposta)
propostaRoutes.post('/', requireAdult(), zValidator('json', CriarPropostaPayloadSchema), async (c) => {
  const payload = c.req.valid('json');
  const { id: instituicaoId } = c.get('user');

  try {
    const res = await strapiPost<StrapiProposta>('/propostas', {
      ...payload,
      instituicaoId,
      estado: 'pendente',
      criadoEm: new Date().toISOString()
    });

    // G15: Impacto no Ecossistema
    await eventBus.publishWithOutbox(DomainEventName.PROPOSTA_CRIADA, {
      propostaId: res.data.id,
      estudanteId: payload.targetId,
      instituicaoId
    });

    return c.json(res.data, 201);
  } catch {
    return c.json({ error: 'Erro ao criar proposta' }, 502);
  }
});

interface StrapiProposta {
  id: string;
  estudanteId: string;
  instituicaoId: string;
  estado: string;
}

// GET /propostas/recebidas
propostaRoutes.get('/recebidas', async (c) => {
  const { id: userId } = c.get('user');
  try {
    const res = await strapiGet<StrapiProposta>('/propostas', {
      'filters[estudanteId][$eq]': userId,
      populate: 'instituicao',
    });
    return c.json(res);
  } catch {
    return c.json({ error: 'Erro ao carregar propostas' }, 502);
  }
});

// POST /propostas/:id/responder
propostaRoutes.post('/:id/responder', requireAdult(), zValidator('json', z.object({ acao: z.enum(['aceitar', 'rejeitar']) })), async (c) => {
  const id = c.req.param('id');
  const { acao } = c.req.valid('json');
  const { id: userId } = c.get('user');

  try {
    const resGet = await strapiGet<StrapiProposta>(`/propostas/${id}`);
    const proposta = resGet.data[0];

    if (!proposta) return c.json({ error: 'Proposta não encontrada' }, 404);

    const targetId = proposta.estudanteId;
    if (targetId !== userId) return c.json({ error: 'Acesso negado' }, 403);

    const novoEstado = acao === 'aceitar' ? 'aceite' : 'rejeitada';
    await strapiPut(`/propostas/${id}`, { estado: novoEstado });

    if (acao === 'aceitar') {
      const instId = proposta.instituicaoId;
      // Criar vínculo automático
      const vinculoRes = await strapiPost<{ id: string | number }>('/vinculos', {
        solicitante: userId,
        destinatario: instId,
        connectionType: 'student-institution',
        status: 'aprovado',
        criadoEm: new Date().toISOString()
      });

      // G15: Impacto no Ecossistema
      await eventBus.publishWithOutbox(DomainEventName.VINCULO_APROVADO, {
        vinculoId: vinculoRes.data.id,
        solicitanteId: userId,
        destinatarioId: instId
      });
    }

    return c.json({ success: true, estado: novoEstado });
  } catch {
    return c.json({ error: 'Erro ao responder proposta' }, 502);
  }
});
