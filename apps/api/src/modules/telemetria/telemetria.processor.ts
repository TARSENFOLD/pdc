import pino from 'pino';
import { strapiGet, strapiPost, strapiPutRaw } from '../strapi/strapi.client.js';
import { heuristicsEngine } from '../analysis/heuristics.engine.js';
import { 
  analyzeFluidity, 
  analyzeResilience, 
  analyzeFocus, 
  type BehaviorPattern,
  type TelemetriaEvento
} from '@pdc/shared';
import { tinaService } from '../tina/tina.service.js';

const log = pino({ name: 'telemetria-processor' });

interface TelemetriaRaw {
  id: number;
  tipo: string;
  payload: Record<string, unknown>;
  timestamp: string;
  clientTimestamp: string;
  visibilityState: string;
}

/**
 * Motor de Performance e Verdade (O Músculo)
 * Processa dados psicométricos para gerar a assinatura comportamental do estudante.
 */
export const telemetriaProcessor = {
  async processUserDomain(perfilId: string, domainId: string): Promise<void> {
    log.info({ perfilId, domainId }, 'Processando padrões comportamentais de elite');

    try {
      // 1. Buscar histórico denso de telemetria
      const eventsRes = await strapiGet<TelemetriaRaw>('/telemetrias', {
        'filters[perfil][id][$eq]': perfilId,
        'filters[tipo][$in]': [
          'simulacao.iniciada', 
          'simulacao.concluida', 
          'simulacao.biomechanics',
          'focus_lost',
          'focus_gained',
          'visibility.lost',
          'visibility.gained'
        ],
        'sort': 'clientTimestamp:asc',
        'pagination[limit]': '1000',
      });

      const events = eventsRes.data;
      if (events.length < 5) {
        log.warn({ perfilId }, 'Dados insuficientes para diagnóstico de autoridade');
        return;
      }

      // 2. Extração de Métricas de Tempo
      const times: number[] = [];
      const timesPosError: number[] = [];
      let totalInterruptionTime = 0;

      for (let i = 1; i < events.length; i++) {
        const current = events[i];
        const previous = events[i - 1];
        
        if (current?.clientTimestamp && previous?.clientTimestamp) {
          const diff = new Date(current.clientTimestamp).getTime() - new Date(previous.clientTimestamp).getTime();
          
          // Filtrar ruído (50ms a 2min)
          if (diff > 50 && diff < 120000) {
            if (current.tipo.startsWith('simulacao.') && current.tipo !== 'simulacao.biomechanics') {
              times.push(diff);
            }
            
            // R: Reação ao erro
            if (previous.tipo.includes('erro') || previous.tipo.includes('falha')) {
              timesPosError.push(diff);
            }
          }

          // Foco: Detetar interrupções
          if (current.tipo === 'focus_lost' || current.tipo === 'visibility.lost') {
            // A interrupção começou aqui
          }
          if (previous.tipo === 'focus_lost' || previous.visibilityState !== 'visible') {
             totalInterruptionTime += diff;
          }
        }
      }

      // 3. Cálculos Soberanos via Heuristics Engine
      const meanTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 2000;
      const fluidity = heuristicsEngine.calculateFluidity(times);
      const resilience = heuristicsEngine.calculateResilience(timesPosError, meanTime);
      const hesitation = heuristicsEngine.calculateHesitation(events as unknown as TelemetriaEvento[]);
      
      const lastEvent = events[events.length - 1];
      const firstEvent = events[0];
      const totalTime = (lastEvent && firstEvent) 
        ? new Date(lastEvent.clientTimestamp).getTime() - new Date(firstEvent.clientTimestamp).getTime()
        : 0;
      const focus = heuristicsEngine.calculateFocus(totalTime, totalInterruptionTime);

      // 4. Diagnóstico de Heurísticas (Shared)
      const hFluidity = analyzeFluidity(fluidity / 10);
      const hResilience = analyzeResilience(resilience / 10);
      const hFocus = analyzeFocus(focus / 10);

      // 5. Persistência de Elite (Upsert)
      const existing = await strapiGet<{ id: number }>('/behavior-patterns', {
        'filters[perfil][id][$eq]': perfilId,
        'filters[domainId][$eq]': domainId,
      });

      const behaviorPayload = {
        perfil: perfilId,
        domainId,
        cognitiveFluidity: fluidity,
        resilienceIndex: resilience,
        focusStability: focus,
        hesitationIndex: hesitation,
        decisionSpeedAvg: meanTime,
        successRate: 0.85, 
        technicalScore: (fluidity + focus + resilience + (10 - hesitation)) / 4,
        tinaSummary: {
          fluidity: hFluidity.insight,
          resilience: hResilience.insight,
          focus: hFocus.insight,
          lastHeuristicUpdate: new Date().toISOString()
        },
        lastUpdatedAt: new Date().toISOString(),
      } as BehaviorPattern;

      const existingId = existing.data?.[0]?.id;
      if (existingId) {
        await strapiPutRaw(`/behavior-patterns/${existingId}`, { data: behaviorPayload });
      } else {
        await strapiPost('/behavior-patterns', behaviorPayload);
      }

      log.info({ perfilId, fluidity: fluidity.toFixed(2), resilience: resilience.toFixed(2) }, 'Músculo behavioral processado e persistido');

      // 6. Camada de Interpretação Assíncrona (Tina)
      // No patamar mundial, a IA não bloqueia o pipeline de dados.
      void this.requestTinaInterpretation(perfilId, domainId, behaviorPayload);

    } catch (err) {
      log.error({ err }, 'Falha crítica no processamento de mérito behavioral');
    }
  },

  async requestTinaInterpretation(perfilId: string, domainId: string, behavior: BehaviorPattern): Promise<void> {
    try {
      const dynamicVerdict = await tinaService.gerarVereditoPsicometrico({
        phi: behavior.cognitiveFluidity,
        resilience: behavior.resilienceIndex,
        focus: behavior.focusStability,
        domainId
      });

      const existing = await strapiGet<{ id: number; tinaSummary: unknown }>('/behavior-patterns', {
        'filters[perfil][id][$eq]': perfilId,
        'filters[domainId][$eq]': domainId,
      });

      const existingData = existing.data?.[0];
      const existingId = existingData?.id;
      if (existingId) {
        const updatedSummary = {
          ...(existingData.tinaSummary || {}),
          verdict: dynamicVerdict,
          tinaUpdatedAt: new Date().toISOString()
        };
        await strapiPutRaw(`/behavior-patterns/${existingId}`, { 
          data: { tinaSummary: updatedSummary } 
        });
        log.info({ perfilId }, 'Interpretação da Tina injetada na assinatura DNA');
      }
    } catch (err) {
      log.warn({ err }, 'Tina indisponível para interpretação. Mantendo heurísticas puras.');
    }
  }
};
