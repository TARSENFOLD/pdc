import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { socketService } from '../modules/realtime/socket.service.js';

type Vars = { Variables: AuthVariables };
export const propostaRoutes = new Hono<Vars>();

propostaRoutes.use('*', verifyJwt);

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
  } catch (err) {
    return c.json({ error: 'Erro ao carregar propostas' }, 502);
  }
});

// POST /propostas/:id/responder
propostaRoutes.post('/:id/responder', zValidator('json', z.object({ acao: z.enum(['aceitar', 'rejeitar']) })), async (c) => {
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
      await strapiPost('/vinculos', {
        senderId: userId,
        receiverId: instId,
        connectionType: 'student-institution',
        estado: 'connected',
      });

      socketService.emitirNotificacao(instId, {
        id: crypto.randomUUID(),
        tipo: 'sucesso',
        titulo: 'Proposta Aceite',
        corpo: `Um estudante aceitou a tua proposta de vínculo.`,
        timestamp: new Date().toISOString(),
      });
    }

    return c.json({ success: true, estado: novoEstado });
  } catch (err) {
    return c.json({ error: 'Erro ao responder proposta' }, 502);
  }
});
