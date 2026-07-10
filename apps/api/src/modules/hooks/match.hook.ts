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
const CANDIDATE_PAGE_SIZE = 100;

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
  areasInteresse?: string[];
}

export interface StrapiBehaviorPattern {
  perfil: { id: number | string };
  cognitiveFluidity?: number;
  resilienceIndex?: number;
  focusStability?: number;
}

async function fetchCandidateProfiles(area: string): Promise<StrapiEstudanteMatchInfo[]> {
  const candidates: StrapiEstudanteMatchInfo[] = [];
  let page = 1;
  let pageCount = 1;

  do {
    const response = await strapiGet<StrapiEstudanteMatchInfo>('/perfis', {
      'filters[tipo][$eq]': 'estudante',
      'filters[areasInteresse][$containsi]': area,
      'pagination[page]': String(page),
      'pagination[pageSize]': String(CANDIDATE_PAGE_SIZE),
      'fields[0]': 'id',
      'fields[1]': 'reputacao',
      'fields[2]': 'areasInteresse',
    });
    candidates.push(...response.data);
    pageCount = response.meta.pagination.pageCount;
    page++;
  } while (page <= pageCount);

  return candidates;
}

const EVENT_TO_MATCH_TYPE: Readonly<Partial<Record<DomainEventName, 'curso' | 'simulacao' | 'experiencia' | 'programa' | 'projeto'>>> = {
  [DomainEventName.CURSO_PUBLICADO]: 'curso',
  [DomainEventName.SIMULACAO_PUBLICADA]: 'simulacao',
  [DomainEventName.EXPERIENCIA_PUBLICADA]: 'experiencia',
  [DomainEventName.PROGRAMA_PUBLICADO]: 'programa',
  [DomainEventName.PROJETO_PUBLICADO]: 'projeto',
};

function resolveMatchEntityType(eventName: DomainEventName): 'curso' | 'simulacao' | 'experiencia' | 'programa' | 'projeto' | null {
  return EVENT_TO_MATCH_TYPE[eventName] ?? null;
}

async function suggestionAlreadyExists(eventId: string, estudanteId: string | number): Promise<boolean> {
  const existing = await strapiGet<unknown>('/match-suggestions', {
    'filters[eventId][$eq]': eventId,
    'filters[estudante][id][$eq]': String(estudanteId),
    'pagination[pageSize]': '1',
  });
  return existing.data.length > 0;
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
    const matchableEvents = Object.keys(EVENT_TO_MATCH_TYPE) as DomainEventName[];

    if (!matchableEvents.includes(event.name)) {
      return { status: 'skipped', reason: 'not-a-matchable-event' };
    }

    const { area, autorId, regrasAcesso } = event.payload;
    const rawEntityId = event.payload.cursoId || event.payload.simulacaoId || event.payload.experienciaId || event.payload.projetoId || event.payload.postId || event.payload.programaId || event.payload.id;
    const entityType = resolveMatchEntityType(event.name);
    if (!entityType) return { status: 'skipped', reason: 'unmapped-entity-type' };

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
      const estudantes = await fetchCandidateProfiles(area);

      const normalizedArea = area.toUpperCase();
      const candidatos = estudantes.filter((perfil) => {
        if (!Array.isArray(perfil.areasInteresse)) return false;
        return perfil.areasInteresse.some(
          (candidateArea) => candidateArea.toUpperCase() === normalizedArea,
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

           if (regrasAcesso.minFluidez) {
             const cf = dna.cognitiveFluidity;
             if (cf !== undefined && Number.isFinite(cf) && cf < regrasAcesso.minFluidez) return;
           }
           if (regrasAcesso.minResiliencia) {
             const ri = dna.resilienceIndex;
             if (ri !== undefined && Number.isFinite(ri) && ri < regrasAcesso.minResiliencia) return;
           }
           if (regrasAcesso.minFoco) {
             const fs = dna.focusStability;
             if (fs !== undefined && Number.isFinite(fs) && fs < regrasAcesso.minFoco) return;
           }

           // Boost de afinidade por superação das expectativas do autor
           if (dna.cognitiveFluidity && regrasAcesso.minFluidez && dna.cognitiveFluidity > regrasAcesso.minFluidez + 2) {
             affinityScore += 0.1;
           }
        }

        if (affinityScore >= minScore) {
          const exists = await suggestionAlreadyExists(event.id, estudante.id).catch(() => false);
          if (exists) return;

          await strapiPost('/match-suggestions', {
            estudante: estudante.id,
            entityType,
            entityId,
            score: Math.min(1, affinityScore),
            tierMinimo: autorTier.charAt(0) + autorTier.slice(1).toLowerCase(),
            expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            eventId: event.id
          });
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
