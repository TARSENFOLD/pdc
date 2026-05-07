import { z } from 'zod';
import { AreaVocacionalSchema, ModalidadeSchema } from './enums.js';

export const ProgramaTipoSchema = z.enum(['standard', 'shadowapro', 'eduvisit']);
export const ProgramaEstadoSchema = z.enum(['draft', 'review', 'approved', 'published', 'archived']);
export const CriadorTipoSchema = z.enum(['mentor', 'instituicao', 'super_admin']);
export const ModoAcessoSchema = z.enum(['livre', 'convite', 'misto']);
export type ModoAcesso = z.infer<typeof ModoAcessoSchema>;

export const CronogramaEtapaSchema = z.object({
  titulo: z.string().min(1).max(100),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  responsavel: z.string().optional(),
});
export type CronogramaEtapa = z.infer<typeof CronogramaEtapaSchema>;

export const ShadowAProCandidaturaSchema = z.object({
  mentorId: z.string(),
  motivo: z.string().min(10).max(500),
  diasPreferidos: z.array(z.string()).optional(),
});
export type ShadowAProCandidatura = z.infer<typeof ShadowAProCandidaturaSchema>;

export const EduVisitaAgendamentoSchema = z.object({
  instituicaoId: z.string(),
  data: z.string().datetime(),
  motivacao: z.string().min(10).max(500).optional(),
  nParticipantes: z.number().int().min(1).optional(),
});
export type EduVisitaAgendamento = z.infer<typeof EduVisitaAgendamentoSchema>;

export const ConvidarInstituicaoSchema = z.object({
  instituicaoConvidadaId: z.string(),
  mensagem: z.string().max(500).optional(),
});
export type ConvidarInstituicao = z.infer<typeof ConvidarInstituicaoSchema>;

export const InscreverAlunosEmMassaSchema = z.object({
  estudantesIds: z.array(z.string()).min(1),
});
export type InscreverAlunosEmMassa = z.infer<typeof InscreverAlunosEmMassaSchema>;

export const ProgramaSchema = z.object({
  id: z.string(),
  slug: z.string().optional(),
  titulo: z.string(),
  descricao: z.string().optional(), // DEPRECATED
  capaUrl: z.string().url().optional().nullable(),
  instituicaoNome: z.string().optional(),
  proposito: z.string().min(10).max(2000),
  metodologia: z.string().min(10).max(2000),
  recursos: z.record(z.unknown()).optional(),
  responsavelId: z.string().optional(),
  area: AreaVocacionalSchema,
  tipo: ProgramaTipoSchema,
  instituicaoId: z.string().optional(),
  instituicao: z.object({
    id: z.string(),
    nome: z.string(),
    logoUrl: z.string().url().optional(),
  }).optional(),
  cursosIds: z.array(z.string()).optional(),
  experienciasIds: z.array(z.string()).optional(),
  simulacoesIds: z.array(z.string()).optional(),
  projetosIds: z.array(z.string()).optional(),
  capa: z.object({
    url: z.string().url(),
  }).optional().nullable(),
  duracao: z.string().optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  modalidade: ModalidadeSchema.optional(),
  vagas: z.number().int().min(0).optional(),
  requisitos: z.string().optional(),
  regrasMatricula: z.record(z.unknown()).optional(),
  precoPolicy: z.record(z.unknown()).optional(),
  criadorTipo: CriadorTipoSchema.optional(),
  historicoEstados: z.array(z.object({
    estado: ProgramaEstadoSchema,
    timestamp: z.string().datetime(),
    autorId: z.string(),
  })).optional(),
  motivoRejeicao: z.string().optional(),
  metadata: z.record(z.unknown()).optional(), // DEPRECATED
  estado: ProgramaEstadoSchema,
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Programa = z.infer<typeof ProgramaSchema>;

export const CriarProgramaPayloadSchema = z.object({
  titulo: z.string().min(3).max(120),
  proposito: z.string().min(10).max(2000),
  metodologia: z.string().min(10).max(2000),
  recursos: z.record(z.unknown()).optional(),
  cronograma: z.array(CronogramaEtapaSchema).optional(),
  responsavelId: z.string().optional(),
  modoAcesso: ModoAcessoSchema.optional(),
  area: AreaVocacionalSchema,
  tipo: ProgramaTipoSchema,
  instituicaoId: z.string().optional(),
  cursosIds: z.array(z.string()).optional(),
  experienciasIds: z.array(z.string()).optional(),
  simulacoesIds: z.array(z.string()).optional(),
  projetosIds: z.array(z.string()).optional(),
  duracao: z.string().optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  modalidade: ModalidadeSchema.optional(),
  vagas: z.number().int().min(0).optional(),
  requisitos: z.string().optional(),
  regrasMatricula: z.record(z.unknown()).optional(),
  precoPolicy: z.record(z.unknown()).optional(),
  criadorTipo: CriadorTipoSchema.optional(),
  tags: z.array(z.string()).optional(),
  profissionalShadow: z.string().optional(),
  areaShadowing: z.string().optional(),
  visitaUrl: z.string().optional(),
  localizacaoFisica: z.string().optional(),
});

export type CriarProgramaPayload = z.infer<typeof CriarProgramaPayloadSchema>;

export const AtualizarProgramaEstadoSchema = z.object({
  estado: ProgramaEstadoSchema,
  motivoRejeicao: z.string().optional(),
});

export type AtualizarProgramaEstadoPayload = z.infer<typeof AtualizarProgramaEstadoSchema>;
