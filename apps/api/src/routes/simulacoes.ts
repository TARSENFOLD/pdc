import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import pino from 'pino';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { CriarSimulacaoPayloadSchema } from '@pdc/shared';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { type Tentativa, analyzeFluidity, analyzeFocus } from '@pdc/shared';

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

interface StrapiSimulacao {
  id: string | number;
  titulo: string;
  autorId: string;
  estado: string;
  tipo: number;
  area: string;
}

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
    const res = await strapiGet<StrapiSimulacao>('/simulacoes', params);
    return c.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /simulacoes/minhas — simulações do mentor
simulacaoRoutes.get('/minhas', checkRole(['mentor', 'super_admin']), async (c) => {
  const { id } = c.get('user');
  try {
    const res = await strapiGet<StrapiSimulacao>('/simulacoes', {
      'filters[autorId][$eq]': id,
      populate: 'capa',
    });
    return c.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /simulacoes/me/tentativas — deve vir antes de /:id
simulacaoRoutes.get('/me/tentativas', async (c) => {
  const { id } = c.get('user');
  try {
    const res = await strapiGet<Tentativa>('/tentativas', {
      'filters[perfil][userId][$eq]': id,
      populate: 'simulacao',
      'sort': 'createdAt:desc',
    });
    return c.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /simulacoes/:id
simulacaoRoutes.get('/:id', async (c) => {
  const simId = c.req.param('id');
  try {
    const res = await strapiGet<StrapiSimulacao>(`/simulacoes/${simId}`, { populate: 'capa,iframeUrl' });
    const data = res.data[0];
    if (!data) return c.json({ error: 'Simulação não encontrada' }, 404);
    
    // Verificação de acesso
    const user = c.get('user');
    if (data.estado !== 'published' && data.autorId !== user.id && !['moderador', 'super_admin'].includes(user.role)) {
      return c.json({ error: 'Acesso negado' }, 403);
    }

    return c.json(res);
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
    const res = await strapiPost<StrapiSimulacao>('/simulacoes', {
      ...payload,
      autorId,
      estado: 'draft',
      slug: payload.titulo.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
    });

    // G15: Impacto no Ecossistema
    await eventBus.publishWithOutbox(DomainEventName.SIMULACAO_CRIADA, {
      simulacaoId: res.data.id,
      autorId,
      titulo: payload.titulo,
      area: payload.area
    });

    return c.json(res, 201);
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
    const resGet = await strapiGet<StrapiSimulacao>(`/simulacoes/${id}`);
    const sim = resGet.data[0];
    if (!sim) return c.json({ error: 'Simulação não encontrada' }, 404);

    if (sim.autorId !== user.id && !['moderador', 'super_admin'].includes(user.role)) {
      return c.json({ error: 'Não tem permissão para editar esta simulação' }, 403);
    }

    const resPut = await strapiPut<StrapiSimulacao>(`/simulacoes/${id}`, payload);
    return c.json(resPut);
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
    const resGet = await strapiGet<StrapiSimulacao>(`/simulacoes/${id}`);
    const sim = resGet.data[0];
    if (!sim) {
      return c.json({ error: 'Simulação não encontrada' }, 404);
    }

    const estadoActual = sim.estado;

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
    const podeEditar = user.id === sim.autorId || ['moderador', 'super_admin'].includes(user.role);
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

    // G15: Impacto no Ecossistema se for publicação
    if (estado === 'published') {
      await eventBus.publishWithOutbox(DomainEventName.SIMULACAO_PUBLICADA, {
        simulacaoId: id,
        autorId: sim.autorId,
        titulo: sim.titulo,
        area: sim.area
      });
    }

    return c.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// POST /simulacoes/tentativas — iniciar tentativa (estudante apenas)
simulacaoRoutes.post('/tentativas', checkRole(['estudante']), zValidator('json', iniciarSchema), async (c) => {
  const { id: userId } = c.get('user');
  const { simulacaoId } = c.req.valid('json');
  try {
    // Buscar perfilId real do usuário
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
    });
    const perfilId = resPerfil.data[0]?.id;
    if (!perfilId) return c.json({ error: 'Perfil não encontrado' }, 404);

    // Buscar simulação para obter tipo
    const resSim = await strapiGet<StrapiSimulacao>(`/simulacoes/${simulacaoId}`);
    const sim = resSim.data[0];
    if (!sim) return c.json({ error: 'Simulação não encontrada' }, 404);

    const tipo = sim.tipo;
    
    // Contar tentativas anteriores
    const prevTentativas = await strapiGet<Tentativa>('/tentativas', {
      'filters[perfil][id][$eq]': perfilId,
      'filters[simulacao][id][$eq]': simulacaoId,
    });
    const tentativaNum = (prevTentativas.meta?.pagination?.total ?? 0) + 1;

    // D22: Usamos dataInicio (PT) para alinhar com o domínio canónico (ADR-012).
    // Strapi tem aliases startedAt/finishedAt, mas BFF prefere PT.
    const resPost = await strapiPost<Tentativa>('/tentativas', {
      simulacao: simulacaoId,
      perfil: perfilId,
      dataInicio: new Date().toISOString(),
      tentativaNum,
      executorTipo: `tipo${tipo}`,
      status: 'em_progresso',
    });

    // G15: Impacto no Ecossistema
    await eventBus.publishWithOutbox(DomainEventName.TENTATIVA_INICIADA, {
      tentativaId: resPost.data.id,
      perfilId: String(perfilId),
      simulacaoId
    });

    return c.json(resPost, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

const concluirSchema = z.object({
  metadata: z.record(z.unknown()).optional(),
});

// PUT /simulacoes/tentativas/:id — concluir tentativa (estudante apenas)
simulacaoRoutes.put('/tentativas/:id', checkRole(['estudante']), zValidator('json', concluirSchema), async (c) => {
  const tentativaId = c.req.param('id');
  const { metadata } = c.req.valid('json');
  const user = c.get('user');

  // G2-T3 Anti-Fraude: Derivação de score no BFF SEMPRE.
  // Qualquer score cliente-side é ignorado. O Oráculo é soberano.
  const parsedFocus = Number(metadata?.focusStability);
  const rawFocus = Number.isNaN(parsedFocus) ? 50 : parsedFocus;
  const phi = Math.max(0, Math.min(100, rawFocus)) / 100;
  const resFluidity = analyzeFluidity(phi);
  const resFocus = analyzeFocus(phi);

  // Média ponderada (DNA Biomecânico)
  const finalScore = (resFluidity.score * 0.4) + (resFocus.score * 0.6);
  log.info({ tentativaId, finalScore, phi }, 'Score Soberano derivado no BFF');

  try {
    // D21/D22: Persistimos metadata da simulação e data de fim em PT.
    const resPut = await strapiPut<Tentativa>(`/tentativas/${tentativaId}`, {
      score: finalScore,
      metadata,
      status: 'concluida',
      dataFim: new Date().toISOString(),
      duracaoSegundos: Number(metadata?.duracaoSegundos) || 0,
    });

    const data = resPut.data;

    // G15: O impacto ecossistémico (Behavior, Ranking, Achievement, Notify) 
    // é agora orquestrado pelo EventBus. O behaviorHook tratará do processamento psicométrico.
    
    // Obter area da simulação para o payload do evento
    const resSimInfo = await strapiGet<Tentativa & { simulacao?: StrapiSimulacao }>(`/tentativas/${tentativaId}?populate=simulacao`);
    const tentativaComSim = resSimInfo.data[0];
    const area = tentativaComSim?.simulacao?.area || (metadata?.domainId as string) || 'geral';

    const resPerfilLookup = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': user.id,
      'fields[0]': 'id',
    });
    const perfilIdReal = resPerfilLookup.data[0]?.id;

    if (perfilIdReal) {
      await eventBus.publishWithOutbox(DomainEventName.TENTATIVA_CONCLUIDA, {
        tentativaId,
        score: finalScore || 0,
        perfilId: String(perfilIdReal),
        area
      });
    }

    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});
