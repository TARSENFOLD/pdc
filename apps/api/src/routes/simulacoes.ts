import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import pino from 'pino';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { CriarSimulacaoPayloadSchema } from '@pdc/shared';

const log = pino({ name: 'routes:simulacoes' });
type Vars = { Variables: AuthVariables };

const simQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  tipo: z.coerce.number().int().min(1).max(3).optional(),
});

const iniciarSchema = z.object({
  simulacaoId: z.string().min(1),
});

const concluirSchema = z.object({
  score: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const simulacaoRoutes = new Hono<Vars>();

simulacaoRoutes.use('*', verifyJwt);

// GET /simulacoes
simulacaoRoutes.get('/', zValidator('query', simQuerySchema), async (c) => {
  const q = c.req.valid('query');
  const params: Record<string, string> = { populate: 'capa,iframeUrl' };
  if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
  if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
  if (q.search !== undefined) params['filters[titulo][$containsi]'] = q.search;
  if (q.tipo !== undefined) params['filters[tipo][$eq]'] = q.tipo.toString();
  
  // Apenas simulações publicadas
  params['filters[estado][$eq]'] = 'published';

  try {
    const data = await strapiGet<unknown>('/simulacoes', params);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /simulacoes/minhas — simulações do mentor
simulacaoRoutes.get('/minhas', checkRole(['mentor', 'super_admin']), async (c) => {
  const { id } = c.get('user');
  try {
    const data = await strapiGet<unknown>('/simulacoes', {
      'filters[autorId][$eq]': id,
      populate: 'capa',
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /simulacoes/me/tentativas — deve vir antes de /:id
simulacaoRoutes.get('/me/tentativas', async (c) => {
  const { id } = c.get('user');
  try {
    const data = await strapiGet<unknown>('/tentativas', {
      'filters[alunoId][$eq]': id,
      populate: 'simulacao',
      'sort': 'createdAt:desc',
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /simulacoes/:id
simulacaoRoutes.get('/:id', async (c) => {
  const simId = c.req.param('id');
  try {
    const data = await strapiGet<any>(`/simulacoes/${simId}`, { populate: 'capa,iframeUrl' });
    
    // Verificação de acesso
    const user = c.get('user');
    if (data.data.estado !== 'published' && data.data.autorId !== user.id && !['moderador', 'super_admin'].includes(user.role)) {
      return c.json({ error: 'Acesso negado' }, 403);
    }

    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// POST /simulacoes — criar simulação
simulacaoRoutes.post('/', checkRole(['mentor', 'super_admin']), zValidator('json', CriarSimulacaoPayloadSchema), async (c) => {
  const payload = c.req.valid('json');
  const { id: autorId } = c.get('user');
  
  try {
    const data = await strapiPost<unknown>('/simulacoes', {
      ...payload,
      autorId,
      estado: 'draft',
      slug: payload.titulo.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
    });
    return c.json(data, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// PUT /simulacoes/:id — editar simulação
simulacaoRoutes.put('/:id', checkRole(['mentor', 'super_admin']), zValidator('json', CriarSimulacaoPayloadSchema.partial()), async (c) => {
  const id = c.req.param('id');
  const payload = c.req.valid('json');
  const user = c.get('user');

  try {
    // Verificar se é o autor
    const sim = await strapiGet<any>(`/simulacoes/${id}`);
    if (sim.data.autorId !== user.id && !['moderador', 'super_admin'].includes(user.role)) {
      return c.json({ error: 'Não tem permissão para editar esta simulação' }, 403);
    }

    const data = await strapiPut<unknown>(`/simulacoes/${id}`, payload);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// PATCH /simulacoes/:id/estado — transição de estado editorial
simulacaoRoutes.patch('/:id/estado', checkRole(['mentor', 'moderador', 'super_admin']), zValidator('json', z.object({
  estado: z.enum(['review', 'published', 'archived']),
})), async (c) => {
  const id = c.req.param('id');
  const { estado } = c.req.valid('json');
  const user = c.get('user');

  try {
    // Buscar simulação actual
    const sim = await strapiGet<any>(`/simulacoes/${id}`);
    if (!sim.data) {
      return c.json({ error: 'Simulação não encontrada' }, 404);
    }

    const estadoActual = sim.data.estado;

    // Validar transições permitidas (similar a cursos)
    const transicaoPermitida = (actual: string, novo: string, role: string): boolean => {
      if (role === 'super_admin') return true;
      if (role === 'moderador') return novo === 'archived' && actual === 'published';
      if (role === 'mentor') {
        if (actual === 'draft' && novo === 'review') return true;
        if (actual === 'approved' && novo === 'published') return true;
      }
      return false;
    };

    // Verificar autorização
    const podeEditar = user.id === sim.data.autorId || ['moderador', 'super_admin'].includes(user.role);
    if (!podeEditar) {
      return c.json({ error: 'Sem permissão para editar esta simulação' }, 403);
    }

    if (!transicaoPermitida(estadoActual, estado, user.role)) {
      return c.json({
        error: `Transição inválida de ${estadoActual} para ${estado}`
      }, 400);
    }

    // Actualizar estado
    await strapiPut<unknown>(`/simulacoes/${id}`, { estado });

    return c.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// POST /simulacoes/tentativas — iniciar tentativa (aluno apenas)
simulacaoRoutes.post('/tentativas', checkRole(['aluno']), zValidator('json', iniciarSchema), async (c) => {
  const { id: alunoId } = c.get('user');
  const { simulacaoId } = c.req.valid('json');
  try {
    // Buscar simulação para obter tipo
    const sim = await strapiGet<{ data: { tipo: number } }>(`/simulacoes/${simulacaoId}`);
    const tipo = sim.data.tipo;
    
    // Contar tentativas anteriores
    const prevTentativas = await strapiGet<{ meta: { pagination: { total: number } } }>('/tentativas', {
      'filters[alunoId][$eq]': alunoId,
      'filters[simulacaoId][$eq]': simulacaoId,
    });
    const tentativaNum = prevTentativas.meta.pagination.total + 1;

    const data = await strapiPost<unknown>('/tentativas', {
      simulacaoId,
      alunoId,
      dataInicio: new Date().toISOString(),
      tentativaNum,
      executorTipo: `tipo${tipo}`,
      status: 'em_progresso',
    });
    return c.json(data, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// PUT /simulacoes/tentativas/:id — concluir tentativa (aluno apenas)
simulacaoRoutes.put('/tentativas/:id', checkRole(['aluno']), zValidator('json', concluirSchema), async (c) => {
  const tentativaId = c.req.param('id');
  const { score, metadata } = c.req.valid('json');
  try {
    const data = await strapiPut<any>(`/tentativas/${tentativaId}`, {
      score,
      metadata,
      status: 'concluida',
      dataFim: new Date().toISOString(),
      duracaoSegundos: metadata?.duracaoSegundos ?? 0,
    });

    // Grade Passback LTI (Ticket T1 Fix)
    if (metadata?.ltiContext) {
      try {
        const { ltiAgsService } = await import('../modules/lti/lti.ags.service.js');
        void ltiAgsService.sendScore(data.data.alunoId, {
          scoreGiven: score || 0,
          scoreMaximum: 10,
          activityProgress: 'Completed',
          gradingProgress: 'FullyGraded',
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        log.error({ err }, 'Falha no Grade Passback LTI');
      }
    }

    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

