import {
  AreaVocacionalSchema,
  CertezaVocacionalSchema,
  VOCACIONAL_EXPLANATION_VERSION,
  VOCACIONAL_HEURISTICS_VERSION,
  VOCACIONAL_MODEL_VERSION,
  type BehaviorPattern,
  type PerfilVocacional,
} from '@pdc/shared';
import { strapiGet, strapiPost, strapiPut } from '../strapi/strapi.client.js';
import { vocacionalService } from './vocacional.service.js';
import type { Recomendacao } from './vocacional.types.js';

interface PerfilSnapshotSource {
  id: string | number;
  documentId?: string;
}

interface SnapshotRecord {
  id: string | number;
  documentId?: string;
  perfil?: PerfilSnapshotSource | string | number;
  scoreGlobal?: number;
  certeza?: string;
  totalEventos?: number;
  areaMatch?: string;
  aptidao?: number;
  dedicacao?: number;
  dimensoes?: PerfilVocacional['dimensoes'];
  modelVersion?: string;
  heuristicsVersion?: string;
  explanationVersion?: string;
  generatedWithAiSupport?: boolean;
  calculationMethod?: 'heuristico_deterministico' | 'ia_assistida';
  razoes?: unknown;
  createdAt?: string;
  updatedAt?: string;
  ultimoCalculoEm?: string;
}

export interface PerfilVocacionalSnapshotResponse {
  perfil: PerfilVocacional;
  patterns: BehaviorPattern[];
  recomendacoes: Recomendacao[];
  scoreGlobal: number;
  certeza: PerfilVocacional['certeza'];
  totalEventos: number;
  areaMatch: PerfilVocacional['areaMatch'];
  lastUpdate: string;
  modelVersion: string;
  heuristicsVersion: string;
  explanationVersion: string;
  generatedWithAiSupport: boolean;
  calculationMethod: PerfilVocacional['calculationMethod'];
  razoes: unknown;
}

function persistedId(record: { id: string | number; documentId?: string }): string {
  return record.documentId ?? String(record.id);
}

function perfilRelationId(record: SnapshotRecord, fallbackPerfilId: string): string {
  const relation = record.perfil;
  if (typeof relation === 'string' || typeof relation === 'number') return String(relation);
  return relation ? String(relation.id) : fallbackPerfilId;
}

function normalizeSnapshot(record: SnapshotRecord, fallbackPerfilId: string): PerfilVocacional {
  const area = AreaVocacionalSchema.safeParse(record.areaMatch);
  const certeza = CertezaVocacionalSchema.safeParse(record.certeza);
  const now = new Date().toISOString();
  return {
    id: String(record.id),
    perfilId: perfilRelationId(record, fallbackPerfilId),
    scoreGlobal: record.scoreGlobal ?? 0,
    certeza: certeza.success ? certeza.data : 'BAIXA',
    totalEventos: record.totalEventos ?? 0,
    areaMatch: area.success ? area.data : 'TECNOLOGIA',
    aptidao: record.aptidao ?? 0,
    dedicacao: record.dedicacao ?? 0,
    dimensoes: record.dimensoes ?? { fluidez: 5, resiliencia: 5, foco: 5, hesitacao: 2 },
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? record.ultimoCalculoEm ?? now,
    modelVersion: record.modelVersion ?? VOCACIONAL_MODEL_VERSION,
    heuristicsVersion: record.heuristicsVersion ?? VOCACIONAL_HEURISTICS_VERSION,
    explanationVersion: record.explanationVersion ?? VOCACIONAL_EXPLANATION_VERSION,
    generatedWithAiSupport: record.generatedWithAiSupport ?? false,
    calculationMethod: record.calculationMethod ?? 'heuristico_deterministico',
  };
}

function buildRazioes(perfil: PerfilVocacional): Record<string, unknown> {
  return {
    areaMatch: `Área dominante definida por padrões comportamentais e interesses declarados em ${perfil.areaMatch}.`,
    scoreGlobal: 'Score pondera eventos reais do percurso e dimensões comportamentais agregadas.',
    certeza: `Certeza ${perfil.certeza} baseada em ${String(perfil.totalEventos)} eventos observados.`,
    versoes: {
      modelVersion: perfil.modelVersion,
      heuristicsVersion: perfil.heuristicsVersion,
      explanationVersion: perfil.explanationVersion,
    },
  };
}

async function fetchPerfil(userId: string): Promise<PerfilSnapshotSource | null> {
  const resPerfil = await strapiGet<PerfilSnapshotSource>('/perfis', {
    'filters[userId][$eq]': userId,
    'fields[0]': 'id',
    'fields[1]': 'documentId',
    'pagination[pageSize]': '1',
  });
  return resPerfil.data[0] ?? null;
}

async function fetchPatterns(perfilId: string | number): Promise<BehaviorPattern[]> {
  const patternsRes = await strapiGet<BehaviorPattern>('/behavior-patterns', {
    'filters[perfil][id][$eq]': String(perfilId),
    sort: 'lastUpdatedAt:desc',
  });
  return patternsRes.data;
}

async function buildResponse(
  perfil: PerfilVocacional,
  patterns: BehaviorPattern[],
  razoes: unknown,
): Promise<PerfilVocacionalSnapshotResponse> {
  const recomendacoes = await vocacionalService.gerarRecomendacoes(perfil);
  return {
    perfil,
    patterns,
    recomendacoes,
    scoreGlobal: perfil.scoreGlobal,
    certeza: perfil.certeza,
    totalEventos: perfil.totalEventos,
    areaMatch: perfil.areaMatch,
    lastUpdate: perfil.updatedAt ?? perfil.createdAt,
    modelVersion: perfil.modelVersion,
    heuristicsVersion: perfil.heuristicsVersion,
    explanationVersion: perfil.explanationVersion,
    generatedWithAiSupport: perfil.generatedWithAiSupport,
    calculationMethod: perfil.calculationMethod,
    razoes,
  };
}

async function getAtual(userId: string): Promise<PerfilVocacionalSnapshotResponse | null> {
  const perfilSource = await fetchPerfil(userId);
  if (!perfilSource) return null;
  const [snapshotRes, patterns] = await Promise.all([
    strapiGet<SnapshotRecord>('/perfil-vocacionais', {
      'filters[perfil][id][$eq]': String(perfilSource.id),
      'filters[atual][$eq]': 'true',
      'sort': 'createdAt:desc',
      'pagination[pageSize]': '1',
      populate: 'perfil',
    }),
    fetchPatterns(perfilSource.id),
  ]);
  const snapshot = snapshotRes.data[0];
  if (!snapshot) return null;
  return buildResponse(normalizeSnapshot(snapshot, String(perfilSource.id)), patterns, snapshot.razoes ?? {});
}

async function gerar(userId: string): Promise<PerfilVocacionalSnapshotResponse> {
  const perfil = await vocacionalService.calcularPerfil(userId);
  const [currentRes, patterns] = await Promise.all([
    strapiGet<SnapshotRecord>('/perfil-vocacionais', {
      'filters[perfil][id][$eq]': perfil.perfilId,
      'filters[atual][$eq]': 'true',
      'fields[0]': 'id',
      'fields[1]': 'documentId',
      'pagination[pageSize]': '25',
    }),
    fetchPatterns(perfil.perfilId),
  ]);

  await Promise.all(currentRes.data.map((snapshot) => (
    strapiPut(`/perfil-vocacionais/${persistedId(snapshot)}`, { atual: false })
  )));

  const razoes = buildRazioes(perfil);
  await strapiPost('/perfil-vocacionais', {
    perfil: perfil.perfilId,
    area: perfil.areaMatch,
    areaMatch: perfil.areaMatch,
    scoreGlobal: perfil.scoreGlobal,
    certeza: perfil.certeza,
    totalEventos: perfil.totalEventos,
    aptidao: perfil.aptidao,
    dedicacao: perfil.dedicacao,
    dimensoes: perfil.dimensoes,
    razoes,
    atual: true,
    modelVersion: perfil.modelVersion,
    heuristicsVersion: perfil.heuristicsVersion,
    explanationVersion: perfil.explanationVersion,
    generatedWithAiSupport: perfil.generatedWithAiSupport,
    calculationMethod: perfil.calculationMethod,
    ultimoCalculoEm: perfil.updatedAt,
  });

  return buildResponse(perfil, patterns, razoes);
}

export const vocacionalSnapshotService = {
  gerar,
  getAtual,
};
