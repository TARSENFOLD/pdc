import { z } from 'zod';
import { PaginationParamsSchema } from './admin.js';

export const DenunciaEstadoSchema = z.enum(['pendente', 'em_analise', 'resolvida', 'rejeitada']);
export type DenunciaEstado = z.infer<typeof DenunciaEstadoSchema>;

export const DenunciaAccaoSchema = z.enum(['banir_utilizador', 'remover_conteudo', 'ignorar', 'advertir']);
export type DenunciaAccao = z.infer<typeof DenunciaAccaoSchema>;

export const DenunciaSchema = z.object({
  id: z.string(),
  denuncianteId: z.string(),
  conteudoId: z.string(),
  conteudoTipo: z.string(),
  motivo: z.string(),
  estado: DenunciaEstadoSchema,
  criadaEm: z.string(),
  resolvidaEm: z.string().optional(),
  resolvidaPor: z.string().optional(),
  accaoTomada: DenunciaAccaoSchema.optional(),
  notasModerador: z.string().optional(),
});

export type Denuncia = z.infer<typeof DenunciaSchema>;

export const DenuncianteSchema = z.object({
  id: z.string(),
  nome: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().url().optional().nullable(),
});
export type Denunciante = z.infer<typeof DenuncianteSchema>;

export const DenunciaComDetalhesSchema = DenunciaSchema.extend({
  denunciante: DenuncianteSchema.optional().nullable(),
});
export type DenunciaComDetalhes = z.infer<typeof DenunciaComDetalhesSchema>;


export const CriarDenunciaPayloadSchema = z.object({
  conteudoId: z.string(),
  conteudoTipo: z.string(),
  motivo: z.string(),
});

export type CriarDenunciaPayload = z.infer<typeof CriarDenunciaPayloadSchema>;

export const ResolverDenunciaPayloadSchema = z.object({
  estado: DenunciaEstadoSchema,
  accaoTomada: DenunciaAccaoSchema.optional(),
  notasModerador: z.string().optional(),
});

export type ResolverDenunciaPayload = z.infer<typeof ResolverDenunciaPayloadSchema>;

export const DenunciaListParamsSchema = PaginationParamsSchema.extend({
  estado: DenunciaEstadoSchema.optional(),
  conteudoTipo: z.string().optional(),
});

export type DenunciaListParams = z.infer<typeof DenunciaListParamsSchema>;
