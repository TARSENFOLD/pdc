import { z } from 'zod';
import { ModalidadeSchema } from './enums.js';

export const ExperienciaSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string().min(5),
  descricao: z.string(),
  
  // Ligação Crítica: A que curso esta experiência pertence?
  cursoId: z.string().uuid(), 
  instituicaoId: z.string().uuid(),
  
  // Detalhes da Grade Curricular (O "Syllabus" Imersivo)
  gradeDestaque: z.array(z.object({
    ano: z.number(),
    disciplina: z.string(),
    descricao: z.string(),
    relevanciaMercado: z.string(),
  })).optional(),

  // Logística
  modalidade: ModalidadeSchema,
  vagas: z.number().int().positive().optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  localizacao: z.string().optional(),

  // Metadados de Telemetria
  telemetriaConfig: z.object({
    trackDwellTime: z.boolean().default(true),
    trackSectionClicks: z.boolean().default(true),
    trackScrollDepth: z.boolean().default(true),
  }).default({}),

  estado: z.enum(['draft', 'review', 'published', 'archived']).default('draft'),
  createdAt: z.string().datetime(),
});

export const CriarExperienciaPayloadSchema = ExperienciaSchema.omit({ 
  id: true, 
  createdAt: true,
  slug: true 
});

export type Experiencia = z.infer<typeof ExperienciaSchema>;
export type CriarExperienciaPayload = z.infer<typeof CriarExperienciaPayloadSchema>;
