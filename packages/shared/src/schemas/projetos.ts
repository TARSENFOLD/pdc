import { z } from 'zod';
import { AreaVocacionalSchema } from './enums.js';
import { PerfilPublicoSchema } from '../user.js';

// Strapi pode devolver string vazia — converte para undefined para não falhar .url()
const OptionalUrlSchema = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().url().optional(),
);

// Modos do projeto (5 modos canónicos)
export const ProjetoModoSchema = z.enum(['exposicao', 'colaboracao', 'mentoria', 'financiamento', 'feedbackComunitario']);
export type ProjetoModo = z.infer<typeof ProjetoModoSchema>;
export const ProjetoEstadoSchema = z.enum(['draft', 'review', 'approved', 'published', 'archived', 'hidden']);
export type ProjetoEstado = z.infer<typeof ProjetoEstadoSchema>;
export const ProjetoVisibilidadeSchema = z.enum(['publico', 'privado']);

// ACL Entry
export const ACLEntrySchema = z.object({
  perfilId: z.string(),
  estado: z.enum(['pendente', 'aprovado', 'rejeitado']),
  solicitadoEm: z.string().datetime(),
  respondidoEm: z.string().datetime().optional(),
});

export type ACLEntry = z.infer<typeof ACLEntrySchema>;

// Voto/Endorsement
export const VotoSchema = z.object({
  perfilId: z.string(),
  tipo: z.enum(['endorsement', 'voto']),
  comentario: z.string().optional(),
  criadoEm: z.string().datetime(),
});

export type Voto = z.infer<typeof VotoSchema>;

// Histórico de Estados
export const HistoricoEstadoSchema = z.object({
  estado: ProjetoEstadoSchema,
  timestamp: z.string().datetime(),
  autorId: z.string(),
});

export type HistoricoEstado = z.infer<typeof HistoricoEstadoSchema>;

export const SeloTipoSchema = z.enum(['publicado', 'validado_mentor', 'validado_instituicao', 'excelencia']);
export type SeloTipo = z.infer<typeof SeloTipoSchema>;

export const SeloSchema = SeloTipoSchema.optional();
export type Selo = z.infer<typeof SeloSchema>;

export const ProjetoSchema = z.object({
  id: z.coerce.string(),
  titulo: z.string(),
  descricao: z.string().optional(), // DEPRECATED
  abstract: z.string().min(10).max(1000),
  core: z.string().min(10).max(5000).optional(),
  area: AreaVocacionalSchema.optional(),
  estudanteId: z.string().optional(),
  capaUrl: OptionalUrlSchema,
  mediaUrls: z.array(z.string().url()).optional(),
  repoUrl: OptionalUrlSchema,
  demoUrl: OptionalUrlSchema,
  tags: z.array(z.string()).default([]),
  estado: ProjetoEstadoSchema,
  visibilidade: ProjetoVisibilidadeSchema.optional(),
  buscandoParceiros: z.boolean().optional(),
  modos: z.array(ProjetoModoSchema).min(1).max(5).refine(
    arr => new Set(arr).size === arr.length,
    { message: 'Modos devem ser únicos' }
  ),
  selo: SeloSchema,
  acessoCoreACL: z.array(ACLEntrySchema).optional(),
  votos: z.array(VotoSchema).optional(),
  historicoEstados: z.array(HistoricoEstadoSchema).optional(),
  autor: z.object({
    id: z.coerce.string(),
    nome: z.string(),
    foto: z.object({
      url: z.string().url(),
    }).optional().nullable(),
  }).optional().nullable(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Projeto = z.infer<typeof ProjetoSchema>;

// Discriminated union por modo para validação especializada
export const CriarProjetoPayloadBaseSchema = z.object({
  titulo: z.string().min(3).max(120),
  abstract: z.string().min(10).max(1000),
  core: z.string().min(10).max(5000).optional(),
  area: AreaVocacionalSchema.optional(),
  capaUrl: OptionalUrlSchema,
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  repoUrl: OptionalUrlSchema,
  demoUrl: OptionalUrlSchema,
  tags: z.array(z.string()).max(10).default([]),
  visibilidade: ProjetoVisibilidadeSchema.optional(),
  buscandoParceiros: z.boolean().optional(),
  modos: z.array(ProjetoModoSchema).min(1).max(5).refine(
    arr => new Set(arr).size === arr.length,
    { message: 'Modos devem ser únicos' }
  ),
});

// Payload específico para modo exposição (pode ter core vazio)
export const CriarProjetoExposicaoPayloadSchema = CriarProjetoPayloadBaseSchema.refine(
  (data) => data.modos.includes('exposicao'),
  { message: 'Modo exposição deve estar presente' }
);

// Payload específico para modo colaboração (obrigatório ter core)
export const CriarProjetoColaboracaoPayloadSchema = CriarProjetoPayloadBaseSchema.extend({
  core: z.string().min(10).max(5000), // obrigatório para colaboração
}).refine(
  (data) => data.modos.includes('colaboracao'),
  { message: 'Modo colaboração deve estar presente' }
);

// Schema unificado para uso geral
export const CriarProjetoPayloadSchema = CriarProjetoPayloadBaseSchema.refine(
  (data) => {
    // Se tem modo colaboração, core é obrigatório
    if (data.modos.includes('colaboracao') && !data.core) {
      return false;
    }
    return true;
  },
  {
    message: 'Core é obrigatório quando modo colaboração está presente',
    path: ['core'],
  }
);

export type CriarProjetoPayload = z.infer<typeof CriarProjetoPayloadSchema>;

// Schema para gerir ACL (aprovar/rejeitar/remover acesso ao core)
export const GerirACLSchema = z.object({
  perfilId: z.string(),
  acao: z.enum(['aprovar', 'rejeitar', 'remover']),
});

export type GerirACLPayload = z.infer<typeof GerirACLSchema>;

// Schema para votar/endorsar um projeto
export const VotoProjetoPayloadSchema = z.object({
  tipo: z.enum(['endorsement', 'voto']),
  comentario: z.string().max(500).optional(),
});

export type VotoProjetoPayload = z.infer<typeof VotoProjetoPayloadSchema>;

export const PedidoAcessoSchema = z.object({
  id: z.string().or(z.number()),
  projeto: z.string().or(z.number()).optional(),
  perfilSolicitante: PerfilPublicoSchema.optional(),
  motivo: z.string().optional(),
  status: z.enum(['pendente', 'aprovado', 'rejeitado']),
  dataResposta: z.string().datetime().optional(),
  createdAt: z.string().datetime().optional(),
});

export type PedidoAcesso = z.infer<typeof PedidoAcessoSchema>;

export const ProjetoFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(12),
  estudanteId: z.string().optional(),
  cursoId: z.string().optional(),
  tags: z.string().optional(),
  estado: ProjetoEstadoSchema.optional(),
  area: AreaVocacionalSchema.optional(),
  modos: ProjetoModoSchema.optional(),
});

export type ProjetoFilters = z.infer<typeof ProjetoFiltersSchema>;

export const TransicaoEstadoPayloadSchema = z.object({
  novoEstado: ProjetoEstadoSchema,
  motivo: z.string().max(500).optional(),
});

export type TransicaoEstadoPayload = z.infer<typeof TransicaoEstadoPayloadSchema>;
