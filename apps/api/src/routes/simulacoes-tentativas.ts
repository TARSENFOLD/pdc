import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import pino from 'pino';
import { type Tentativa, analyzeFluidity, analyzeFocus } from '@pdc/shared';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import type { AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';

const log = pino({ name: 'routes:simulacoes:tentativas' });
type Vars = { Variables: AuthVariables };

interface StrapiSimulacao {
  id: string | number;
  titulo: string;
  autorId: string;
  estado: string;
  tipo: number;
  area: string;
}

const iniciarSchema = z.object({
  simulacaoId: z.string().min(1),
});

const concluirSchema = z.object({
  metadata: z.record(z.unknown()).optional(),
});

const SIMULACAO_ALLOWED_STATES = new Set(['approved', 'published']);

function parsePositiveDuration(metadata: Record<string, unknown> | undefined): number | null {
  const provided = Number(metadata?.['duracaoSegundos']);
  if (Number.isFinite(provided) && provided > 0) {
    return Math.floor(provided);
  }

  const dataInicio = typeof metadata?.['dataInicio'] === 'string' ? metadata['dataInicio'] : undefined;
  const dataFim = typeof metadata?.['dataFim'] === 'string' ? metadata['dataFim'] : undefined;
  if (!dataInicio || !dataFim) return null;

  const inicioMs = Date.parse(dataInicio);
  const fimMs = Date.parse(dataFim);
  if (!Number.isFinite(inicioMs) || !Number.isFinite(fimMs) || fimMs <= inicioMs) {
    return null;
  }

  return Math.max(1, Math.floor((fimMs - inicioMs) / 1000));
}

function parsePercentMetric(value: unknown, fallback: number): number {
  const parsed = Number(value);
  const raw = Number.isNaN(parsed) ? fallback : parsed;
  return Math.max(0, Math.min(100, raw));
}

export const simulacaoTentativasRoutes = new Hono<Vars>();

// POST /simulacoes/tentativas — iniciar tentativa (estudante apenas)
simulacaoTentativasRoutes.post('/', checkRole(['estudante']), zValidator('json', iniciarSchema), async (c) => {
  const { id: userId } = c.get('user');
  const { simulacaoId } = c.req.valid('json');
  try {
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
    });
    const perfilId = resPerfil.data[0]?.id;
    if (!perfilId) return c.json({ error: 'Perfil não encontrado' }, 404);

    const resSim = await strapiGet<StrapiSimulacao>(`/simulacoes/${simulacaoId}`);
    const sim = resSim.data[0];
    if (!sim) return c.json({ error: 'Simulação não encontrada' }, 404);
    if (!SIMULACAO_ALLOWED_STATES.has(sim.estado)) {
      return c.json({ error: 'Simulação não está disponível' }, 403);
    }

    const prevTentativas = await strapiGet<Tentativa>('/tentativas', {
      'filters[perfil][id][$eq]': perfilId,
      'filters[simulacao][id][$eq]': simulacaoId,
    });
    const tentativaNum = prevTentativas.meta.pagination.total + 1;

    const resPost = await strapiPost<Tentativa>('/tentativas', {
      simulacao: simulacaoId,
      perfil: perfilId,
      dataInicio: new Date().toISOString(),
      tentativaNum,
      executorTipo: `tipo${sim.tipo.toString()}`,
      status: 'em_progresso',
      metadata: { perfilId, userId },
    });

    await eventBus.publishWithOutbox(DomainEventName.TENTATIVA_INICIADA, {
      tentativaId: resPost.data.id,
      perfilId,
      simulacaoId,
    });

    return c.json(resPost, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// PUT /simulacoes/tentativas/:id — concluir tentativa (estudante apenas)
simulacaoTentativasRoutes.put('/:id', checkRole(['estudante']), zValidator('json', concluirSchema), async (c) => {
  const tentativaId = c.req.param('id');
  const user = c.get('user');
  const { metadata } = c.req.valid('json');
  const duracaoSegundos = parsePositiveDuration(metadata);
  if (duracaoSegundos === null) {
    return c.json({ error: 'duracaoSegundos deve ser positivo ou derivável de dataInicio/dataFim' }, 400);
  }

  const focusStability = parsePercentMetric(metadata?.focusStability, 50);
  const fluidityStability = parsePercentMetric(
    metadata?.fluidityStability ?? metadata?.cognitiveFluidity ?? metadata?.phi,
    focusStability,
  );
  const focusPhi = focusStability / 100;
  const fluidityPhi = fluidityStability / 100;
  const resFluidity = analyzeFluidity(fluidityPhi);
  const resFocus = analyzeFocus(focusPhi);
  const finalScore = (resFluidity.score + resFocus.score) / 2;
  log.info({ tentativaId, finalScore, fluidityPhi, focusPhi }, 'Score Soberano derivado no BFF');

  try {
    const resPut = await strapiPut<Tentativa>(`/tentativas/${tentativaId}`, {
      score: finalScore,
      metadata,
      status: 'concluida',
      dataFim: new Date().toISOString(),
      duracaoSegundos,
    });

    const resSimInfo = await strapiGet<Tentativa & { simulacao?: StrapiSimulacao; perfil?: { id: string } }>(`/tentativas/${tentativaId}?populate=simulacao,perfil`);
    const tentativaComSim = resSimInfo.data[0];
    const area = tentativaComSim?.simulacao?.area || (metadata?.domainId as string) || 'geral';
    const metadataPerfilId = typeof metadata?.perfilId === 'string' ? metadata.perfilId : undefined;
    const perfilIdReal = tentativaComSim?.perfil?.id ?? metadataPerfilId;

    if (perfilIdReal) {
      await eventBus.publishWithOutbox(DomainEventName.TENTATIVA_CONCLUIDA, {
        tentativaId,
        score: finalScore || 0,
        perfilId: perfilIdReal,
        area,
      });
    } else {
      log.warn({ tentativaId, userId: user.id }, 'Perfil ausente — TENTATIVA_CONCLUIDA não publicada');
    }

    return c.json(resPut.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});
