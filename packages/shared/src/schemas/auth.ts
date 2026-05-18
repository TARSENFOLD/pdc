import { z } from 'zod';

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

// Strict per-role onboarding payloads — only admit role-specific fields
export const OAuthFinalizarEstudantePayloadSchema = z.object({
  role: z.literal('estudante'),
});

export const OAuthFinalizarMentorPayloadSchema = z.object({
  role: z.literal('mentor'),
  areaEspecialidade: z.string().min(1),
  documentos: z.array(OAuthFinalizarDocumentoSchema).min(1),
});

export const OAuthFinalizarInstituicaoPayloadSchema = z.object({
  role: z.literal('instituicao'),
  nomeInstituicao: z.string().min(1),
  tipoInstituicao: z.string().min(1),
  documentos: z.array(OAuthFinalizarDocumentoSchema).min(1),
});

export const OAuthFinalizarRoleChoiceSchema = z.discriminatedUnion('role', [
  OAuthFinalizarEstudantePayloadSchema,
  OAuthFinalizarMentorPayloadSchema,
  OAuthFinalizarInstituicaoPayloadSchema,
]);

export type OAuthFinalizarRoleChoice = z.infer<typeof OAuthFinalizarRoleChoiceSchema>;

export const OAuthFinalizarOtpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

export type OAuthFinalizarOtp = z.infer<typeof OAuthFinalizarOtpSchema>;
