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
  regrasAcesso?: {
    minFluidez?: number;
    minResiliencia?: number;
    minFoco?: number;
  };
}

export interface StrapiAutorMatchInfo {
  id: number | string;
  reputacao?: number;
}

export interface StrapiEstudanteMatchInfo {
  id: number | string;
  reputacao?: number;
  areasInteresse?: unknown;
}

export interface StrapiBehaviorPattern {
  perfil: { id: number | string };
  cognitiveFluidity?: number;
  resilienceIndex?: number;
  focusStability?: number;
}

/**
 * Hook 3: MATCH
 * Gera sugestões para o Match Terminal baseadas em afinidade, tier e DNA Biomecânico.
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

    const { area, autorId, regrasAcesso } = event.payload;
    const rawEntityId = event.payload.cursoId || event.payload.simulacaoId || event.payload.experienciaId || event.payload.projetoId || event.payload.postId || event.payload.programaId || event.payload.id;
    const entityType = event.name.split('.')[0];

    if (!area) return { status: 'skipped', reason: 'missing-area-for-match' };
    if (!rawEntityId) return { status: 'fatal_error', reason: 'entityId-missing' };
    
    const entityId = String(rawEntityId);

    try {
      // 1. Obter tier do autor
      const resAutor = await strapiGet<StrapiAutorMatchInfo>('/perfis', {
        'filters[id][$eq]': autorId,
        'fields[0]': 'id',
        'fields[1]': 'reputacao',
        'pagination[pageSize]': '1',
      });
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
        'filters[tipo][$eq]': 'estudante',
        'pagination[pageSize]': '100',
        'fields[0]': 'id',
        'fields[1]': 'reputacao',
        'fields[2]': 'areasInteresse',
      });

      const normalizedArea = area.toLocaleUpperCase();
      const candidatos = resEstudantes.data.filter((perfil) => {
        if (!Array.isArray(perfil.areasInteresse)) return false;
        return perfil.areasInteresse.some(
          (candidateArea) => typeof candidateArea === 'string' && candidateArea.toLocaleUpperCase() === normalizedArea,
        );
      });
      if (candidatos.length === 0) return { status: 'sent', data: { matchesCreated: 0, candidatesEvaluated: 0, minScore } };

      // 3. Obter DNA Biomecânico em Batch (Soberania)
      // Workaround for precise batch:
      const dnaMap = new Map<string, StrapiBehaviorPattern>();
      for (const c of candidatos) {
         try {
           const res = await strapiGet<StrapiBehaviorPattern>('/behavior-patterns', { 'filters[perfil][id][$eq]': String(c.id) });
           if (res.data[0]) dnaMap.set(String(c.id), res.data[0]);
         } catch { /* ignorar sem histórico biomecanico */ }
      }

      let matchesCreated = 0;

      const promises = candidatos.map(async (estudante) => {
        const estRep = estudante.reputacao || 0;
        const estScore = estRep / 100;
        let affinityScore = 0.7 + (estScore * 0.3);

        // 4. Aplicação do Gardião de Mérito (DNA Biomecânico)
        if (regrasAcesso) {
           const dna = dnaMap.get(String(estudante.id));
           if (!dna) return; // Sem histórico = Bloqueado das recomendações premium

           if (regrasAcesso.minFluidez && (dna.cognitiveFluidity || 0) < regrasAcesso.minFluidez) return;
           if (regrasAcesso.minResiliencia && (dna.resilienceIndex || 0) < regrasAcesso.minResiliencia) return;
           if (regrasAcesso.minFoco && (dna.focusStability || 0) < regrasAcesso.minFoco) return;

           // Boost de afinidade por superação das expectativas do autor
           if (dna.cognitiveFluidity && regrasAcesso.minFluidez && dna.cognitiveFluidity > regrasAcesso.minFluidez + 2) {
             affinityScore += 0.1;
           }
        }

        if (affinityScore >= minScore) {
          await strapiPost('/match-suggestions', {
            estudante: estudante.id,
            entityType,
            entityId,
            score: Math.min(1, affinityScore),
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
