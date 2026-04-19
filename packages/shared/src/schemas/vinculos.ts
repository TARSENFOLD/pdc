import { z } from 'zod';
import { PerfilPublicoSchema } from '../user.js';

export const VinculoEstadoSchema = z.enum(['pending', 'connected', 'declined']);
export type VinculoEstado = z.infer<typeof VinculoEstadoSchema>;

export const VinculoTipoSchema = z.enum([
  'student-student',
  'student-mentor',
  'student-institution',
  'mentor-institution',
]);
export type VinculoTipo = z.infer<typeof VinculoTipoSchema>;

export const VinculoSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  estado: VinculoEstadoSchema,
  connectionType: VinculoTipoSchema,
  criadoEm: z.string().datetime(),
});

export type Vinculo = z.infer<typeof VinculoSchema>;

export const VinculoStatusSchema = z.object({
  estado: VinculoEstadoSchema.nullable(),
  vinculoId: z.string().nullable(),
  isSender: z.boolean(),
});

export type VinculoStatus = z.infer<typeof VinculoStatusSchema>;

export const VinculoComPerfilSchema = VinculoSchema.extend({
  senderPerfil: PerfilPublicoSchema,
  receiverPerfil: PerfilPublicoSchema,
});

export type VinculoComPerfil = z.infer<typeof VinculoComPerfilSchema>;

export const CriarVinculoPayloadSchema = z.object({
  receiverId: z.string().min(1),
  connectionType: VinculoTipoSchema,
});

export type CriarVinculoPayload = z.infer<typeof CriarVinculoPayloadSchema>;

export const AceitarRejeitarVinculoPayloadSchema = z.object({
  acao: z.enum(['aceitar', 'rejeitar']),
});

export type AceitarRejeitarVinculoPayload = z.infer<typeof AceitarRejeitarVinculoPayloadSchema>;
