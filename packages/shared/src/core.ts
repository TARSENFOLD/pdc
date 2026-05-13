import { z } from 'zod';
import { AreaVocacionalSchema } from './schemas/enums.js';

// ─── Tipos e Interfaces de Decisão Soberana ──────────────────────────────────

export interface DashboardEstudante {
  stats: {
    xp: number;
    reputacao: number;
    conquistasCount: number;
    vinkulosCount: number;
    pulseVariacao: number | null;
  };
  match: {
    area: string;
    score: number;
    insight: string;
    directive: string;
  };
  behavior: {
    domainId: string;
    fluidez: number;
    resiliencia: number;
    foco: number;
  } | null;
  progressoCursos: Array<{
    id: string;
    titulo: string;
    progresso: number;
  }>;
  proximaAcao: {
    label: string;
    to: string;
  };
  insightsTina: string[];
}

export type {
  MentorPublico,
  InstituicaoPublica,
  PerfilPublico,
  PerfilPublicoBasico,
  PerfilCompleto,
  UpdatePerfilPayload,
  VisibilitySettings,
  FieldVisibility,
  User,
  Role
} from './user.js';

export { UpdatePerfilPayloadSchema } from './user.js';

export type { CursoPublico } from './cursos.js';
export type { SimulacaoPublica, SimulacaoMinha, SimulacaoFilters } from './simulacoes.js';
export type { ExperienciaPublica, ExperienciaMinha } from './experiencias.js';
export type { StrapiListResponse, StrapiSingleResponse, StrapiError } from './strapi.js';

// ─── Catálogo & Exploração ──────────────────────────────────────────────────

export interface CatalogoMeta {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export interface CatalogoResponse<T> {
  data: T[];
  meta: CatalogoMeta;
}

export type ExplorarItemTipo = 'perfil' | 'curso' | 'simulacao' | 'experiencia' | 'mentor' | 'instituicao';

export interface ExplorarItem {
  id: string;
  tipo: ExplorarItemTipo;
  titulo: string;
  slug: string;
  descricao?: string;
  capaUrl?: string;
  area?: string;
  metadata?: Record<string, unknown>;
}

export interface ExplorarResultado {
  data: ExplorarItem[];
  meta: CatalogoMeta;
}

// ─── Perfil Vocacional (SSOT G1-T1) ─────────────────────────────────────────

export const CertezaVocacionalSchema = z.enum(['BAIXA', 'MEDIA', 'ALTA']);
export type CertezaVocacional = z.infer<typeof CertezaVocacionalSchema>;

export const PerfilVocacionalSchema = z.object({
  id: z.string(),
  perfilId: z.string(),
  areaMatch: AreaVocacionalSchema,
  scoreGlobal: z.number(),
  certeza: CertezaVocacionalSchema,
  totalEventos: z.number().default(0),
  aptidao: z.number().default(0),
  dedicacao: z.number().default(0),
  dimensoes: z.object({
    fluidez: z.number(),
    resiliencia: z.number(),
    foco: z.number(),
    hesitacao: z.number().optional(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type PerfilVocacional = z.infer<typeof PerfilVocacionalSchema>;

// ─── IA & Interações ────────────────────────────────────────────────────────

export interface QuizPergunta {
  id: string;
  pergunta: string;
  opcoes: string[];
  respostaCorreta?: number;
  explicacao?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export const ChatPayloadSchema = z.object({
  message: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional(),
  stream: z.boolean().optional().default(false),
  context: z.record(z.unknown()).optional(),
});

export type ChatPayload = z.infer<typeof ChatPayloadSchema>;

// ─── Feed & Scoring ─────────────────────────────────────────────────────────

export type { FeedItemTipo, FeedWeights, UpdateFeedWeightsPayload } from './feed.js';

// ─── LTI & Integrações ──────────────────────────────────────────────────────

export interface LtiPlataforma {
  id: string;
  nome: string;
  clientId: string;
  deploymentId: string;
  issuer: string;
  authLoginUrl: string;
  authTokenUrl: string;
  keySetUrl: string;
  ativo: boolean;
}

export interface CreateLtiPlataformaPayload {
  nome: string;
  clientId: string;
  deploymentId: string;
  issuer: string;
  authLoginUrl: string;
  authTokenUrl: string;
  keySetUrl: string;
  ativo?: boolean;
}

export interface LtiScore {
  userId: string;
  scoreGiven: number;
  scoreMaximum: number;
  comment?: string;
  activityId: string;
  timestamp: string;
  activityProgress: string;
  gradingProgress: string;
}

export interface MutationResult {
  id: string | number;
  eventId?: string; // G15 Telemetry ID
}

export const CreateCommentPayloadSchema = z.object({
  targetId: z.string(),
  targetType: z.string(),
  conteudo: z.string(),
  parentId: z.string().optional(),
});
export type CreateCommentPayload = z.infer<typeof CreateCommentPayloadSchema>;

export interface Comment extends Record<string, unknown> {
  id: string;
  userId: string;
  conteudo: string;
  createdAt: string;
  autor?: {
    nome?: string;
    avatarUrl?: string;
  };
}
