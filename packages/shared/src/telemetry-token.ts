import { z } from 'zod';

export const TelemetryTokenPayloadSchema = z.object({
  sub: z.string().describe('User ID (UUID ou CUID)'),
  perfilId: z.string().describe('Perfil ID (UUID ou CUID)'),
  iss: z.literal('pdc-v2-bff'),
  aud: z.literal('pdc-v2-edge'),
  exp: z.number().int().positive(),
  iat: z.number().int().positive(),
});

export type TelemetryTokenPayload = z.infer<typeof TelemetryTokenPayloadSchema>;
