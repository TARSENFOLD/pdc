import { z } from 'zod';
import { AreaVocacionalSchema } from './schemas/enums.js';

// ─── AI & Chat ───────────────────────────────────────────────────────────────

export const ChatRoleSchema = z.enum(['user', 'assistant', 'system']);
export type ChatRole = z.infer<typeof ChatRoleSchema>;

export const ChatMessageSchema = z.object({
  role: ChatRoleSchema,
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatPayloadSchema = z.object({
  messages: z.array(ChatMessageSchema).optional(),
  message: z.string(),
  stream: z.boolean().optional(),
  context: z.record(z.unknown()).optional(),
});
export type ChatPayload = z.infer<typeof ChatPayloadSchema>;

// ─── Academic & Quiz ─────────────────────────────────────────────────────────

export const QuizPerguntaSchema = z.object({
  id: z.string(),
  pergunta: z.string(),
  opcoes: z.array(z.string()),
  respostaCorrecta: z.number(),
  explicacao: z.string().optional(),
});
export type QuizPergunta = z.infer<typeof QuizPerguntaSchema>;

// ─── LTI 1.3 ─────────────────────────────────────────────────────────────────

export const LtiScoreSchema = z.object({
  userId: z.string().optional(),
  scoreGiven: z.number(),
  scoreMaximum: z.number(),
  comment: z.string().optional(),
  activityProgress: z.string(),
  gradingProgress: z.string(),
  timestamp: z.string(),
});
export type LtiScore = z.infer<typeof LtiScoreSchema>;

export type LtiLaunchClaims = Record<string, unknown>;

export const LtiPlataformaSchema = z.object({
  id: z.string(),
  nome: z.string(),
  issuer: z.string(),
  clientId: z.string(),
  authEndpoint: z.string().optional(),
  tokenEndpoint: z.string().optional(),
  jwksEndpoint: z.string().optional(),
  authLoginUrl: z.string(),
  authTokenUrl: z.string(),
  keySetUrl: z.string(),
  ativo: z.boolean(),
});
export type LtiPlataforma = z.infer<typeof LtiPlataformaSchema>;

export const CreateLtiPlataformaPayloadSchema = LtiPlataformaSchema.omit({ id: true });
export type CreateLtiPlataformaPayload = z.infer<typeof CreateLtiPlataformaPayloadSchema>;

// ─── Catalogo & Meta ──────────────────────────────────────────────────────────

export const CatalogoMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  pageCount: z.number(),
});
export type CatalogoMeta = z.infer<typeof CatalogoMetaSchema>;

export interface CatalogoResponse<T> {
  data: T[];
  pagination: CatalogoMeta;
}

export interface ExplorarResultado {
  id: string;
  tipo: 'curso' | 'simulacao' | 'experiencia' | 'mentor' | 'instituicao';
  titulo: string;
  slug?: string | undefined;
  descricao?: string | undefined;
  area?: string | undefined;
  capaUrl?: string | null | undefined;
  imagemUrl?: string | undefined; // Mantido para retrocompatibilidade
}

// ─── Feed ────────────────────────────────────────────────────────────────────

export const FeedWeightsSchema = z.object({
  engagement: z.number(),
  completion: z.number(),
  rating: z.number(),
  recency: z.number(),
  reputation: z.number(),
  affinity: z.number(),
  time: z.number(),
});
export type FeedWeights = z.infer<typeof FeedWeightsSchema>;

export const UpdateFeedWeightsPayloadSchema = FeedWeightsSchema;
export type UpdateFeedWeightsPayload = z.infer<typeof UpdateFeedWeightsPayloadSchema>;

// ─── Registo Payloads ──────────────────────────────────────────────────────────

export const RegistoEstudantePayloadSchema = z.object({
  nome: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  areaInteresse: AreaVocacionalSchema.optional(),
  regiao: z.string().optional(),
  nivelEnsino: z.string().optional(),
});
export type RegistoEstudantePayload = z.infer<typeof RegistoEstudantePayloadSchema>;

export const RegistoMentorPayloadSchema = z.object({
  nome: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  especialidade: z.string(),
  areasAtuacao: z.array(AreaVocacionalSchema),
  areaEspecialidade: AreaVocacionalSchema.optional(),
  bio: z.string().optional(),
  documentos: z.array(z.string()).optional(),
});
export type RegistoMentorPayload = z.infer<typeof RegistoMentorPayloadSchema>;

export const RegistoInstituicaoPayloadSchema = z.object({
  nome: z.string().min(3),
  nomeInstituicao: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(8),
  nif: z.string(),
  tipo: z.enum(['universidade', 'escola_tecnica', 'centro_formacao', 'outro']),
  website: z.string().url().optional(),
  regiao: z.string().optional(),
  documentos: z.array(z.string()).optional(),
});
export type RegistoInstituicaoPayload = z.infer<typeof RegistoInstituicaoPayloadSchema>;

// ─── Outros ──────────────────────────────────────────────────────────────────

export interface PerfilVocacional extends Record<string, unknown> {
  estudanteId: string;
  scoreGlobal: number;
  areaMatch: string;
  certeza: number; // 0-1 (autoridade)
  aptidao: number; // 0-1
  dedicacao: number; // 0-1
  consistencia: number; // 0-1
  diversidade: number; // 0-1
  updatedAt: string;
  dimensoes: {
    fluidez: number;
    resiliencia: number;
    foco: number;
    hesitacao: number;
  };
}

export interface DashboardEstudante {
  stats: {
    xp: number;
    reputacao: number;
    conquistasCount: number;
    vinkulosCount: number;
    pulseVariacao: number; // ex: +12
  };
  match: {
    area: string;
    score: number; // ex: 87
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

export { MentorPublico, InstituicaoPublica, PerfilPublico, PerfilPublicoBasico } from './user.js';
export { CursoPublico } from './cursos.js';
export { SimulacaoPublica } from './simulacoes.js';
export { ExperienciaPublica } from './experiencias.js';

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
}
