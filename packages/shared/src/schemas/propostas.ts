import { z } from 'zod';
import { AreaVocacionalSchema } from './enums.js';

export const PropostaTipoSchema = z.enum(['emprego', 'estagio', 'bolsa', 'parceria']);
export type PropostaTipo = z.infer<typeof PropostaTipoSchema>;

export const TierMinimoSchema = z.enum(['bronze', 'prata', 'ouro', 'diamante']);
export type TierMinimo = z.infer<typeof TierMinimoSchema>;

// Shared base states
const BaseEstadoSchema = z.enum(['pendente', 'aceite', 'rejeitada']);

// PropostaSchema specific
export const PropostaEstadoSchema = z.enum([...BaseEstadoSchema.options, 'recusada']);
export type PropostaEstado = z.infer<typeof PropostaEstadoSchema>;

// MatchSuggestion specific  
export const MatchEstadoSchema = z.enum([...BaseEstadoSchema.options, 'interesse']);
export type MatchEstado = z.infer<typeof MatchEstadoSchema>;

export const PropostaSchema = z.object({
  id: z.string(),
  tipo: PropostaTipoSchema,
  titulo: z.string(),
  mensagem: z.string(),
  targetId: z.string(),
  senderId: z.string(),
  estado: PropostaEstadoSchema,
  status: PropostaEstadoSchema.optional(),
  createdAt: z.string().datetime(),
  area: AreaVocacionalSchema.optional(),
  tierMinimo: TierMinimoSchema.optional(),
  numCandidatos: z.number().int().min(1).max(500).optional(),
  linkCurso: z.string().url().optional().or(z.literal('')),
});

export type Proposta = z.infer<typeof PropostaSchema>;

export const CriarPropostaPayloadSchema = PropostaSchema.omit({
  id: true,
  createdAt: true,
  estado: true,
  senderId: true,
});

export type CriarPropostaPayload = z.infer<typeof CriarPropostaPayloadSchema>;

// G12 — Match Suggestion (output do match hook)
export const MatchSuggestionSchema = z.object({
  id: z.string(),
  estudanteId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  score: z.number().min(0).max(1),
  tierMinimo: TierMinimoSchema.optional(),
  expiraEm: z.string().datetime().optional(),
  estado: MatchEstadoSchema.default('pendente'),
  titulo: z.string().optional(),
  descricao: z.string().optional(),
  autorNome: z.string().optional(),
  autorAvatar: z.string().optional(),
  instituicaoNome: z.string().optional(),
  vagas: z.number().optional(),
  createdAt: z.string().datetime().optional(),
});

export type MatchSuggestion = z.infer<typeof MatchSuggestionSchema>;

// G12-T5 — Match Weights (super_admin tuneable)
export const MatchWeightsSchema = z.object({
  pesoAreaAfinidade: z.number().min(0).max(1),
  pesoReputacao: z.number().min(0).max(1),
  pesoRecency: z.number().min(0).max(1),
  tierBronze: z.number().min(0).max(1),
  tierPrata: z.number().min(0).max(1),
  tierOuro: z.number().min(0).max(1),
  tierDiamante: z.number().min(0).max(1),
});

export type MatchWeights = z.infer<typeof MatchWeightsSchema>;

// G12-T4 — Match Analytics (B2B funil)
export const MatchAnalyticsSchema = z.object({
  candidatosSugeridos: z.number(),
  candidatosVistos: z.number(),
  candidatosInteresse: z.number(),
  candidatosAceite: z.number(),
  candidatosMatriculados: z.number(),
  topAreas: z.array(z.object({ area: z.string(), count: z.number() })),
});

export type MatchAnalytics = z.infer<typeof MatchAnalyticsSchema>;
