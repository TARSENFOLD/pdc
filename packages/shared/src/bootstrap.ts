import { z } from 'zod';
import { RoleSchema } from './user.js';

export const BootstrapResponseSchema = z.object({
  session: z.object({
    isAuthenticated: z.boolean(),
    user: z.object({
      id: z.string(),
      email: z.string(),
      role: RoleSchema,
      perfilId: z.string().optional(),
    }).nullable(),
  }),
  capabilities: z.object({
    features: z.record(z.string(), z.boolean()).describe('Dicionário limpo de Feature -> boolean (ON/OFF)'),
    roles: z.array(RoleSchema).describe('Lista de roles suportadas'),
  }),
  security: z.object({
    telemetryToken: z.string().optional().describe('Token JWS curto emitido pelo BFF para o Edge (W1-T2)'),
  }),
  ux: z.object({
    theme: z.enum(['claro', 'escuro', 'sistema']).default('claro'),
  }),
});

export type BootstrapResponse = z.infer<typeof BootstrapResponseSchema>;
