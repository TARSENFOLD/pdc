import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authService } from '../modules/auth/auth.service.js';
import { rateLimitRegisto } from '../middleware/rateLimit.js';
import {
  RegistoEstudantePayloadSchema,
  RegistoMentorPayloadSchema,
  RegistoInstituicaoPayloadSchema,
} from '@pdc/shared';
import { initiate2faChallenge } from './auth.otp.js';
import { type AuthVariables } from '../modules/auth/auth.middleware.js';

export const registerRoutes = new Hono<{ Variables: AuthVariables }>();

registerRoutes.use('/*', rateLimitRegisto);

registerRoutes.post('/estudante', zValidator('json', RegistoEstudantePayloadSchema), async (c) => {
  const { email, password, nome, areaInteresse, nivelEnsino } = c.req.valid('json');
  try {
    const user = await authService.registerWithRole(email, password, nome, 'aluno', { 
      areasInteresse: [areaInteresse], 
      nivelEnsino 
    });
    return await initiate2faChallenge(c, user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return c.json({ error: message }, 400);
  }
});

registerRoutes.post('/mentor', zValidator('json', RegistoMentorPayloadSchema), async (c) => {
  const { email, password, nome, areaEspecialidade, documentos } = c.req.valid('json');
  try {
    const user = await authService.registerWithRole(email, password, nome, 'mentor', { 
      areaFormacao: areaEspecialidade, 
      documentos: documentos ?? [], 
      aprovado: false 
    });
    return await initiate2faChallenge(c, user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return c.json({ error: message }, 400);
  }
});

registerRoutes.post('/instituicao', zValidator('json', RegistoInstituicaoPayloadSchema), async (c) => {
  const { nome, email, password, regiao, tipo, documentos } = c.req.valid('json');
  try {
    const user = await authService.registerWithRole(email, password, nome, 'instituicao', { 
      regiao, 
      tipoInstituicao: tipo, 
      documentos: documentos ?? [], 
      aprovado: false 
    });
    return await initiate2faChallenge(c, user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return c.json({ error: message }, 400);
  }
});
