import { ApiError, http } from '../../lib/api/http';
import type { ReputacaoBreakdown } from '@pdc/shared';

export interface PatternData {
  domainId: string;
  cognitiveFluidity: number;
  resilienceIndex: number;
  focusStability: number;
  technicalScore: number;
  tinaSummary?: {
    fluidity?: string;
    resilience?: string;
    focus?: string;
    verdict?: string;
    lastHeuristicUpdate?: string;
  } | undefined;
}

export interface RelatorioElite {
  patterns: PatternData[];
  scoreGlobal: number;
  recomendacoes: Array<{
    id: string;
    titulo: string;
    matchPercentagem: number;
    motivo: string;
  }>;
}

interface PerfilPremiumResponse {
  scoreGlobal: number;
  patterns: Array<{
    id?: string;
    domainId: string;
    cognitiveFluidity: number;
    resilienceIndex: number;
    focusStability: number;
    technicalScore: number;
    tinaSummary?: Record<string, unknown>;
  }>;
  recomendacoes: Array<{
    id: string;
    titulo: string;
    matchPercentagem: number;
    motivo: string;
  }>;
  lastUpdate?: string;
}

function normalizeTinaSummary(value: Record<string, unknown> | undefined): PatternData['tinaSummary'] {
  if (!value) return undefined;
  const summary: NonNullable<PatternData['tinaSummary']> = {};
  if (typeof value['fluidity'] === 'string') summary.fluidity = value['fluidity'];
  if (typeof value['resilience'] === 'string') summary.resilience = value['resilience'];
  if (typeof value['focus'] === 'string') summary.focus = value['focus'];
  if (typeof value['verdict'] === 'string') summary.verdict = value['verdict'];
  if (typeof value['lastHeuristicUpdate'] === 'string') summary.lastHeuristicUpdate = value['lastHeuristicUpdate'];
  return summary;
}

export function isApiNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export async function fetchPerfilVocacional(): Promise<PerfilPremiumResponse> {
  try {
    return await http.get<PerfilPremiumResponse>('/vocacional/atual');
  } catch (err: unknown) {
    if (isApiNotFound(err)) {
      return http.post<PerfilPremiumResponse>('/vocacional/gerar', {});
    }
    throw err;
  }
}

export function fetchReputacao(): Promise<ReputacaoBreakdown> {
  return http.get<ReputacaoBreakdown>('/reputacao/me');
}

export function toRelatorioElite(response: PerfilPremiumResponse): RelatorioElite {
  return {
    scoreGlobal: response.scoreGlobal,
    patterns: response.patterns.map((pattern) => ({
      domainId: pattern.domainId,
      cognitiveFluidity: pattern.cognitiveFluidity,
      resilienceIndex: pattern.resilienceIndex,
      focusStability: pattern.focusStability,
      technicalScore: pattern.technicalScore,
      tinaSummary: normalizeTinaSummary(pattern.tinaSummary),
    })),
    recomendacoes: response.recomendacoes,
  };
}
