import pino from 'pino';
import { strapiGet, strapiPost, strapiPutRaw } from '../strapi/strapi.client.js';
import { analyzeFluidity, analyzeResilience, analyzeFocus } from '../analysis/heuristics.engine.js';

const log = pino({ name: 'telemetria-processor' });

interface TelemetriaRaw {
  id: number;
  tipo: string;
  clientTimestamp: string;
  visibilityState: string;
}

/**
 * Motor de Performance e Verdade (O Músculo)
 * Processa dados psicométricos para gerar a assinatura comportamental do aluno.
 */
export const telemetriaProcessor = {
  async processUserDomain(perfilId: string, domainId: string): Promise<void> {
    log.info({ perfilId, domainId }, 'Processando padrões comportamentais de elite');

    try {
      // 1. Buscar histórico denso de telemetria
      const eventsRes = await strapiGet<{ data: TelemetriaRaw[] }>('/telemetrias', {
        'filters[perfil][id][$eq]': perfilId,
        'filters[targetType][$eq]': 'simulation',
        'sort': 'clientTimestamp:asc',
        'pagination[limit]': '1000',
      });

      const events = eventsRes.data;
      if (events.length < 10) {
        log.warn({ perfilId }, 'Dados insuficientes para diagnóstico de autoridade');
        return;
      }

      // 2. Cálculo de Fluidez (Phi) - Distribuição Normal de Reação
      const intervals: number[] = [];
      for (let i = 1; i < events.length; i++) {
        const current = events[i];
        const previous = events[i - 1];
        
        if (current?.clientTimestamp && previous?.clientTimestamp) {
          const diff = new Date(current.clientTimestamp).getTime() - new Date(previous.clientTimestamp).getTime();
          // Ignorar ruído: menos de 50ms (mecânico) ou mais de 2 minutos (pausa externa)
          if (diff > 50 && diff < 120000) {
            intervals.push(diff);
          }
        }
      }

      const mean = intervals.length > 0 ? (intervals.reduce((a, b) => a + b, 0) / intervals.length) : 2000;
      const variance = intervals.length > 0 ? (intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length) : 100;
      const stdDev = Math.sqrt(variance);
      const cv = mean > 0 ? (stdDev / mean) : 0; // Coeficiente de Variação (Consistência)
      
      const baseline = 2000; // 2s baseline universal
      // phi = rapidez * consistência
      const fluidity = Math.min(10, (baseline / Math.max(1, mean)) * (1 - cv) * 10);

      // 3. Algoritmo de Resiliência (R) - Reação ao Erro
      let rSum = 0;
      let rCount = 0;
      events.forEach((evt, i) => {
        const next = events[i + 1];
        if (evt.tipo.includes('erro') && next?.clientTimestamp && evt.clientTimestamp) {
          const postErrorTime = new Date(next.clientTimestamp).getTime() - new Date(evt.clientTimestamp).getTime();
          // r = 1 (Calma/Recuperação), r < 1 (Frustração/Chute), r > 1 (Paralisia)
          const r = postErrorTime / Math.max(1, mean);
          rSum += r;
          rCount++;
        }
      });
      
      const resilienceIndex = rCount > 0 ? (rSum / rCount) : 1.0;

      // 4. Estabilidade de Foco (S) - Permanência vs Distrações
      const visibleEvents = events.filter(e => e.visibilityState === 'visible').length;
      const focusStability = (visibleEvents / events.length) * 10;

      // 5. Diagnóstico de Heurísticas
      const hFluidity = analyzeFluidity(fluidity / 10);
      const hResilience = analyzeResilience(resilienceIndex);
      const hFocus = analyzeFocus(focusStability / 10);

      // 6. Persistência de Elite (Upsert)
      const existing = await strapiGet<{ data: Array<{ id: number }> }>('/behavior-patterns', {
        'filters[perfil][id][$eq]': perfilId,
        'filters[domainId][$eq]': domainId,
      });

      const payload = {
        perfil: perfilId,
        domainId,
        cognitiveFluidity: fluidity,
        resilienceIndex: Math.min(10, resilienceIndex * 5),
        focusStability,
        successRate: 0.85, // Placeholder - integrado com tentativas futuramente
        technicalScore: (fluidity + focusStability) / 2,
        tinaSummary: {
          fluidity: hFluidity.insight,
          resilience: hResilience.insight,
          focus: hFocus.insight,
          verdict: `Perfil vocacional de alta autoridade técnica no domínio ${domainId}.`
        },
        lastUpdatedAt: new Date().toISOString(),
      };

      const existingId = existing.data?.[0]?.id;
      if (existingId) {
        await strapiPutRaw(`/behavior-patterns/${existingId}`, { data: payload });
      } else {
        await strapiPost('/behavior-patterns', payload);
      }

      log.info({ perfilId, fluidity: fluidity.toFixed(2), resilience: resilienceIndex.toFixed(2) }, 'Padrão Behavioral atualizado com sucesso');

    } catch (err) {
      log.error({ err }, 'Falha crítica no processamento de mérito behavioral');
    }
  }
};
