import { 
  type EcosystemHook, 
  EcosystemHookName, 
  type EcosystemHookResult, 
  type DomainEvent, 
  DomainEventName 
} from '@pdc/shared';
import { strapiGet, strapiPost } from '../strapi/strapi.client.js';
import * as reputationService from '../reputation/reputation.service.js';
import pino from 'pino';

const log = pino({ name: 'match-hook' });

export interface MatchPayload {
  autorId: string;
  area?: string;
  cursoId?: string | number;
  simulacaoId?: string | number;
  experienciaId?: string | number;
  projetoId?: string | number;
  postId?: string | number;
  programaId?: string | number;
  id?: string | number;
}

export interface StrapiAutorMatchInfo {
  reputacao?: number;
}

export interface StrapiEstudanteMatchInfo {
  id: number | string;
  reputacao?: number;
}

/**
 * Hook 3: MATCH
 * Gera sugestões para o Match Terminal baseadas em afinidade e tier.
 */
export const matchHook: EcosystemHook<MatchPayload> = {
  name: EcosystemHookName.MATCH,
  dependencies: [],

  idempotencyKey: (event) => `match:${event.id}`,

  async execute(event: DomainEvent<MatchPayload>): Promise<EcosystemHookResult> {
    const matchableEvents = [
      DomainEventName.CURSO_PUBLICADO,
      DomainEventName.SIMULACAO_PUBLICADA,
      DomainEventName.EXPERIENCIA_PUBLICADA,
      DomainEventName.PROGRAMA_PUBLICADO,
      DomainEventName.PROJETO_PUBLICADO,
    ];

    if (!matchableEvents.includes(event.name)) {
      return { status: 'skipped', reason: 'not-a-matchable-event' };
    }

    const { area, autorId } = event.payload;
    const rawEntityId = event.payload.cursoId || event.payload.simulacaoId || event.payload.experienciaId || event.payload.projetoId || event.payload.postId || event.payload.programaId || event.payload.id;
    const entityType = event.name.split('.')[0];

    if (!area) return { status: 'skipped', reason: 'missing-area-for-match' };
    if (!rawEntityId) return { status: 'fatal_error', reason: 'entityId-missing' };
    
    const entityId = String(rawEntityId);

    try {
      // 1. Obter tier do autor
      const resAutor = await strapiGet<StrapiAutorMatchInfo>(`/perfis/${autorId}`, { 'fields[0]': 'reputacao' });
      const autorData = resAutor.data[0];
      const autorRep = autorData?.reputacao || 0;
      const autorTier = reputationService.getTier(autorRep);

      const tierThresholds: Record<string, number> = {
        'BRONZE': 0.40,
        'PRATA': 0.55,
        'OURO': 0.70,
        'DIAMANTE': 0.85
      };
      const minScore = tierThresholds[autorTier] || 0.40;

      // 2. Procurar estudantes candidatos
      const resEstudantes = await strapiGet<StrapiEstudanteMatchInfo>('/perfis', {
        'filters[role][$eq]': 'estudante',
        'filters[areaInteresse][$eq]': area,
        'pagination[pageSize]': '100',
        'fields[0]': 'id',
        'fields[1]': 'reputacao'
      });

      const candidatos = resEstudantes.data;
      let matchesCreated = 0;

      const promises = candidatos.map(async (estudante) => {
        const estRep = estudante.reputacao || 0;
        const estScore = estRep / 100;
        const affinityScore = 0.7 + (estScore * 0.3);

        if (affinityScore >= minScore) {
          await strapiPost('/match-suggestions', {
            estudante: estudante.id,
            entityType,
            entityId,
            score: affinityScore,
            tierMinimo: autorTier.charAt(0) + autorTier.slice(1).toLowerCase(),
            expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            eventId: event.id
          }).catch(() => null);
          matchesCreated++;
        }
      });

      await Promise.all(promises);

      return { 
        status: 'sent', 
        data: { matchesCreated, candidatesEvaluated: candidatos.length, minScore } 
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      log.error({ err, event: event.name, entityId }, 'Falha no hook de match');
      return { status: 'retryable_error', reason: message };
    }
  }
};
