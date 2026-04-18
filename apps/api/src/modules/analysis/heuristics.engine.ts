import {
  analyzeFluidity as sharedAnalyzeFluidity,
  analyzeResilience as sharedAnalyzeResilience,
  analyzeFocus as sharedAnalyzeFocus,
  analyzeHesitation as sharedAnalyzeHesitation,
  type DiagnosticLevel,
  type HeuristicResult
} from '@pdc/shared';

/**
 * Motor de Heurísticas do PDC v2
 * Este módulo orquestra e re-exporta as fórmulas puras alojadas na `@pdc/shared`.
 */

export type { DiagnosticLevel, HeuristicResult };

export const analyzeFluidity = sharedAnalyzeFluidity;
export const analyzeResilience = sharedAnalyzeResilience;
export const analyzeFocus = sharedAnalyzeFocus;
export const analyzeHesitation = sharedAnalyzeHesitation;

