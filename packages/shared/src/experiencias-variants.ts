import { z } from 'zod';

export const TipoExperienciaSchema = z.enum(['institucional', 'vwx']);
export const VwxSchema = z.object({
  profissao: z.string().max(160),
  entidade: z.string().max(200),
  objetivo: z.string().max(3000),
});
export const VwxValidacaoSchema = z.object({
  responsavel: z.string().trim().min(3).max(200),
  referencia: z.string().trim().min(5).max(2000),
  registadoEm: z.string().datetime().optional(),
  registadoPor: z.string().optional(),
});
export const VWX_SECTION_TYPES = [
  'contexto',
  'briefing',
  'exploracao',
  'pratica',
  'entregavel',
  'debrief',
  'reflexao',
] as const;
export const VWX_SECTION_LABELS: Record<(typeof VWX_SECTION_TYPES)[number], string> = {
  contexto: 'Contexto profissional',
  briefing: 'Briefing',
  exploracao: 'Exploração',
  pratica: 'Prática',
  entregavel: 'Entregável',
  debrief: 'Debrief',
  reflexao: 'Reflexão',
};
export const ProgressoExperienciaPayloadSchema = z.object({
  secoesConcluidas: z.array(z.string().min(1)).max(200),
  entrega: z.string().max(20000).default(''),
  reflexao: z.string().max(10000).default(''),
  concluir: z.boolean().default(false),
});
export const ParticipacaoExperienciaSchema = z.object({
  id: z.string(),
  secoesConcluidas: z.array(z.string()).default([]),
  entrega: z.string().default(''),
  reflexao: z.string().default(''),
  concluidoEm: z.string().nullable().optional(),
});
export type ProgressoExperienciaPayload = z.infer<typeof ProgressoExperienciaPayloadSchema>;
export type ParticipacaoExperiencia = z.infer<typeof ParticipacaoExperienciaSchema>;
