import { z } from 'zod';
import { TipoInstituicaoSchema } from './instituicoes-base.js';
import {
  AceiteLegalSchema,
  ConsentimentoEncarregadoSchema,
  DataNascimentoSchema,
  resolveEstadoMenoridade,
} from '../compliance.js';

export const DocumentoSchema = z.object({
  tipo: z.string().min(1),
  url: z.string().url(),
});

export const PerfilPendenteSchema = z.object({
  id: z.number(),
  userId: z.number(),
  nome: z.string().min(1),
  tipo: z.enum(['mentor', 'instituicao']),
  email: z.string().email(),
  createdAt: z.string().datetime(),
  documentos: z.array(DocumentoSchema).optional(),
  // Mentor-specific
  areaFormacao: z.string().optional(),
  regiao: z.string().optional(),
  // Instituicao-specific
  tipoInstituicao: z.string().optional(),
  natureza: z.string().optional(),
});

export type PerfilPendente = z.infer<typeof PerfilPendenteSchema>;

export const AprovacaoActionSchema = z.discriminatedUnion('aprovado', [
  z.object({ perfilId: z.string().min(1), aprovado: z.literal(true) }),
  z.object({ perfilId: z.string().min(1), aprovado: z.literal(false), motivo: z.string().min(10).max(500) }),
]);

export type AprovacaoAction = z.infer<typeof AprovacaoActionSchema>;

// Strict role-specific OAuth onboarding document schema
export const OAuthFinalizarDocumentoSchema = z.object({
  tipo: z.string().min(1),
  url: z.string().url(),
});

export type OAuthFinalizarDocumento = z.infer<typeof OAuthFinalizarDocumentoSchema>;

const OAuthFinalizarComplianceSchema = z.object({
  dataNascimento: DataNascimentoSchema,
  aceiteLegal: AceiteLegalSchema,
  consentimentoEncarregado: ConsentimentoEncarregadoSchema.optional(),
});

// Strict per-role onboarding payloads — only admit role-specific fields
export const OAuthFinalizarEstudantePayloadSchema = OAuthFinalizarComplianceSchema.extend({
  role: z.literal('estudante'),
});

export const OAuthFinalizarMentorPayloadSchema = OAuthFinalizarComplianceSchema.extend({
  role: z.literal('mentor'),
  areaEspecialidade: z.string().min(1),
  documentos: z.array(OAuthFinalizarDocumentoSchema).min(1),
});

export const OAuthFinalizarInstituicaoPayloadSchema = OAuthFinalizarComplianceSchema.extend({
  role: z.literal('instituicao'),
  nomeInstituicao: z.string().min(1),
  tipoInstituicao: TipoInstituicaoSchema,
});

export const OAuthFinalizarRoleChoiceSchema = z.discriminatedUnion('role', [
  OAuthFinalizarEstudantePayloadSchema,
  OAuthFinalizarMentorPayloadSchema,
  OAuthFinalizarInstituicaoPayloadSchema,
]).superRefine((payload, ctx) => {
  const estadoMenoridade = resolveEstadoMenoridade(payload.dataNascimento);
  if (payload.role === 'estudante' && estadoMenoridade === 'menor' && !payload.consentimentoEncarregado) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['consentimentoEncarregado'],
      message: 'Consentimento do encarregado é obrigatório para menores.',
    });
  }

  if (payload.role !== 'estudante' && estadoMenoridade === 'menor') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataNascimento'],
      message: 'Mentores e instituições devem ser representados por utilizadores adultos.',
    });
  }
});

export type OAuthFinalizarRoleChoice = z.infer<typeof OAuthFinalizarRoleChoiceSchema>;

export const OAuthFinalizarOtpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

export type OAuthFinalizarOtp = z.infer<typeof OAuthFinalizarOtpSchema>;
