import { z } from 'zod';
import { AreaVocacionalSchema } from './enums.js';

export const ProjetoModoSchema = z.enum([
  'Exposicao',
  'Colaboracao',
  'Mentoria',
  'Financiamento',
  'FeedbackComunitario',
]);

export const ProjetoAbstractSchema = z.object({
  titulo: z.string().optional(),
  problema: z.string().optional(),
  impacto: z.string().optional(),
  categoria: z.string().optional(),
  tags: z.array(z.string()).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
});

export const ProjetoCoreSchema = z.object({
  metodologia: z.string().optional(),
  dadosSensiveis: z.string().optional(),
  codigoFonte: z.string().optional(),
  planosTecnicos: z.string().optional(),
});

export const ProjetoSeloSchema = z.enum(['aptidao_validada', 'comite_aprovado', 'mentor_endorsed']);

export const PedidoAcessoSchema = z.object({
  id: z.string(),
  perfilSolicitante: z.object({
    id: z.string(),
    nome: z.string(),
  }).optional().nullable(),
  motivo: z.string().optional(),
  status: z.enum(['pendente', 'aprovado', 'rejeitado']),
  dataResposta: z.string().datetime().optional().nullable(),
  createdAt: z.string().datetime().optional(),
});

export type ProjetoModo = z.infer<typeof ProjetoModoSchema>;
export type ProjetoAbstract = z.infer<typeof ProjetoAbstractSchema>;
export type ProjetoCore = z.infer<typeof ProjetoCoreSchema>;
export type PedidoAcesso = z.infer<typeof PedidoAcessoSchema>;
export type ProjetoSelo = z.infer<typeof ProjetoSeloSchema>;

export const ProjetoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string().optional(),
  abstract: ProjetoAbstractSchema.optional().nullable(),
  core: ProjetoCoreSchema.optional().nullable(),
  modos: z.array(ProjetoModoSchema).optional().nullable(),
  selo: ProjetoSeloSchema.optional().nullable(),
  area: AreaVocacionalSchema.optional(),
  estudanteId: z.string().optional(),
  capaUrl: z.string().url().optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  repoUrl: z.string().url().optional(),
  demoUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  estado: z.enum(['draft', 'review', 'approved', 'published', 'archived']),
  visibilidade: z.enum(['publico', 'privado']).optional(),
  buscandoParceiros: z.boolean().optional(),
  autor: z.object({
    id: z.string(),
    nome: z.string(),
    foto: z.object({
      url: z.string().url(),
    }).optional().nullable(),
  }).optional().nullable(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Projeto = z.infer<typeof ProjetoSchema>;

export const CriarProjetoPayloadSchema = z.object({
  titulo: z.string().min(3).max(120),
  descricao: z.string().optional(),
  abstract: ProjetoAbstractSchema.optional(),
  core: ProjetoCoreSchema.optional(),
  modos: z.array(ProjetoModoSchema).optional(),
  area: AreaVocacionalSchema.optional(),
  capaUrl: z.string().url().optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  repoUrl: z.string().url().optional(),
  demoUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  estado: z.enum(['draft', 'review', 'approved', 'published', 'archived']).optional(),
  visibilidade: z.enum(['publico', 'privado']).optional(),
  buscandoParceiros: z.boolean().optional(),
});

export type CriarProjetoPayload = z.infer<typeof CriarProjetoPayloadSchema>;

export const ProjetoFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(12),
  estudanteId: z.string().optional(),
  cursoId: z.string().optional(),
  tags: z.string().optional(),
});

export type ProjetoFilters = z.infer<typeof ProjetoFiltersSchema>;
