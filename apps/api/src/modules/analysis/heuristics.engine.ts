import { analyzeResilience, analyzeFocus } from '@pdc/shared';

/**
 * Heuristics Engine — PDC v2
 * Transforma métricas brutas em scores psicométricos soberanos.
 */
export const heuristicsEngine = {
  /**
   * Calcula a Fluidez Cognitiva (phi)
   * phi = (baseline / mean_time) * (1 - coefficient_of_variation)
   */
  calculateFluidity(times: number[], baselineMs = 2000): number {
    if (times.length === 0) return 0;
    
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean; // Coeficiente de Variação

    const phi = (baselineMs / mean) * (1 - cv);
    return Math.max(0, Math.min(10, phi * 10)); // Normaliza para 0-10
  },

  /**
   * Calcula o Índice de Resiliência (R)
   * R = tempo_pos_erro / tempo_medio_normal
   */
  calculateResilience(timesPosError: number[], meanTimeNormal: number): number {
    if (timesPosError.length === 0) return 1.0; // Padrão ideal (sem erro ou sem mudança de ritmo)
    
    const meanPosError = timesPosError.reduce((a, b) => a + b, 0) / timesPosError.length;
    const r = meanPosError / meanTimeNormal;
    
    // Converte para escala 0-10 baseada na análise do shared
    const analysis = analyzeResilience(r);
    return analysis.score;
  },

  /**
   * Calcula a Estabilidade de Foco
   * focus = (tempo_focado / tempo_total)
   */
  calculateFocus(totalTimeMs: number, interruptionTimeMs: number): number {
    if (totalTimeMs <= 0) return 0;
    const stability = (totalTimeMs - interruptionTimeMs) / totalTimeMs;
    const analysis = analyzeFocus(stability);
    return analysis.score;
  },

  /**
   * Calcula a Hesitação Mecânica (Entropia)
   * Baseado na trajetória do rato vs deslocamento directo.
   */
  calculateHesitation(events: any[]): number {
    const bioEvents = events.filter(e => e.tipo === 'simulacao.biomechanics');
    if (bioEvents.length < 2) return 0;

    let erraticMovements = 0;
    for (let i = 1; i < bioEvents.length; i++) {
      const prev = bioEvents[i - 1].payload;
      const curr = bioEvents[i].payload;
      const dt = new Date(bioEvents[i].timestamp).getTime() - new Date(bioEvents[i - 1].timestamp).getTime();
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Entropia: movimento pequeno em tempo longo (hesitação mecânica/vibrante)
      if (dist < 5 && dt > 500) {
        erraticMovements++;
      }
    }

    // Normaliza: 5 movimentos erráticos = score 10 de hesitação
    return Math.min(10, erraticMovements * 2);
  }
};
