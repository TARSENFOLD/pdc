import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { CriarPropostaPayloadSchema } from '@pdc/shared';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };

export const propostasRoutes = new Hono<Vars>();

propostasRoutes.use('*', verifyJwt);

// GET /propostas — listar propostas enviadas pela instituição autenticada
propostasRoutes.get('/', checkRole(['instituicao', 'super_admin']), async (c) => {
  const { id: instituicaoId } = c.get('user');
  try {
    const data = await strapiGet<unknown>('/propostas', {
      'filters[instituicaoId][$eq]': instituicaoId,
      populate: 'estudante',
      sort: 'createdAt:desc',
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// POST /propostas — criar proposta para estudante
propostasRoutes.post(
  '/',
  checkRole(['instituicao', 'super_admin']),
  zValidator('json', CriarPropostaPayloadSchema),
  async (c) => {
    const { id: instituicaoId } = c.get('user');
    const body = c.req.valid('json');
    try {
      // 1. Criar a proposta
      const proposta = await strapiPost<any>('/propostas', {
        ...body,
        instituicaoId,
        estado: 'pendente',
      });

      // 2. Criar ou atualizar vínculo pendente se não existir
      // Nota: No PDC v2, propostas e vínculos estão relacionados. 
      // Se uma instituição faz uma proposta, ela quer se vincular ao aluno.
      await strapiPost<unknown>('/vinculos', {
        senderId: instituicaoId,
        receiverId: body.estudanteId,
        connectionType: 'student-institution',
        estado: 'pending',
      }).catch(() => { /* Ignorar se já existe ou falhar, o foco é a proposta */ });

      return c.json(proposta, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro interno';
      return c.json({ error: message }, 502);
    }
  }
);

// PATCH /propostas/:id — estudante aceita/rejeita proposta
propostasRoutes.patch(
  '/:id',
  checkRole(['aluno', 'super_admin']),
  zValidator('json', z.object({
    estado: z.enum(['aceite', 'recusada']),
  })),
  async (c) => {
    const id = c.req.param('id');
    const { id: alunoId } = c.get('user');
    const { estado } = c.req.valid('json');
    try {
      const proposta = await strapiGet<any>(`/propostas/${id}`);
      if (!proposta?.data && !proposta?.id) {
        return c.json({ error: 'Proposta não encontrada' }, 404);
      }
      
      const targetId = proposta.data?.attributes?.estudanteId ?? proposta.estudanteId;
      if (targetId !== alunoId && c.get('user').role !== 'super_admin') {
        return c.json({ error: 'Sem permissão para responder a esta proposta' }, 403);
      }

      const updated = await strapiPut<any>(`/propostas/${id}`, { estado });

      // Se aceite, atualizar o vínculo para connected
      if (estado === 'aceite') {
        const instId = proposta.data?.attributes?.instituicaoId ?? proposta.instituicaoId;
        const vinculos = await strapiGet<any>('/vinculos', {
          'filters[senderId][$eq]': instId,
          'filters[receiverId][$eq]': alunoId,
          'filters[connectionType][$eq]': 'student-institution',
        });
        
        if (vinculos?.data?.length > 0) {
          const vId = vinculos.data[0].id;
          await strapiPut<unknown>(`/vinculos/${vId}`, { estado: 'connected' });
        }
      }

      return c.json(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro interno';
      return c.json({ error: message }, 502);
    }
  }
);
