import { z } from 'zod';
import { PerfilPublicoSchema } from '../user.js';

export const VinculoEstadoSchema = z.enum(['pendente', 'aprovado', 'rejeitado', 'concluido']);
export type VinculoEstado = z.infer<typeof VinculoEstadoSchema>;

export const VinculoTipoSchema = z.enum([
  'student-student',
  'student-mentor',
  'student-institution',
  'mentor-institution',
]);
export type VinculoTipo = z.infer<typeof VinculoTipoSchema>;

export const VinculoSchema = z.object({
  id: z.string().or(z.number()),
  solicitante: PerfilPublicoSchema.optional(),
  destinatario: PerfilPublicoSchema.optional(),
  solicitanteId: z.string().or(z.number()).optional(),
  destinatarioId: z.string().or(z.number()).optional(),
  status: VinculoEstadoSchema,
  connectionType: VinculoTipoSchema.optional(),
  mensagem: z.string().max(300).optional(),
  documentoUrl: z.string().url().optional(),
  visibleOnProfile: z.boolean().optional(),
  dataTerminacao: z.string().optional(),
  criadoEm: z.string().optional(),
  resolvidoEm: z.string().optional(),
});

export type Vinculo = z.infer<typeof VinculoSchema>;

export const VinculoStatusSchema = z.object({
  status: VinculoEstadoSchema.nullable(),
  vinculoId: z.string().nullable(),
  isSender: z.boolean(),
});

export type VinculoStatus = z.infer<typeof VinculoStatusSchema>;

export const VinculoComPerfilSchema = VinculoSchema.extend({
  solicitante: PerfilPublicoSchema,
  destinatario: PerfilPublicoSchema,
});

export type VinculoComPerfil = z.infer<typeof VinculoComPerfilSchema>;

export const CriarVinculoPayloadSchema = z.object({
  receiverId: z.string().min(1),
  connectionType: VinculoTipoSchema,
});

export type CriarVinculoPayload = z.infer<typeof CriarVinculoPayloadSchema>;

export const AceitarRejeitarVinculoPayloadSchema = z.object({
  status: z.enum(['aprovado', 'rejeitado']),
});

export type AceitarRejeitarVinculoPayload = z.infer<typeof AceitarRejeitarVinculoPayloadSchema>;

export const PedidoVinculoPayloadSchema = z.object({
  mensagem: z.string().max(300).optional(),
  documentoUrl: z.string().url().optional(),
});

export type PedidoVinculoPayload = z.infer<typeof PedidoVinculoPayloadSchema>;

export const VisibilityVinculoPayloadSchema = z.object({
  visibleOnProfile: z.boolean(),
});

export type VisibilityVinculoPayload = z.infer<typeof VisibilityVinculoPayloadSchema>;
