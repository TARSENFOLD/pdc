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
import { provisionInstituicaoForUser } from '../modules/instituicoes/instituicao.provision.js';
import pino from 'pino';

export const registerRoutes = new Hono<{ Variables: AuthVariables }>();
const log = pino({ name: 'auth-register' });

registerRoutes.use('/*', rateLimitRegisto);

function getRegisterErrorStatus(err: unknown): 400 | 409 | 500 {
  const status = err !== null && typeof err === 'object' && 'status' in err
    ? (err as { status?: unknown }).status
    : undefined;
  if (status === 409) return 409;
  return 400;
}

registerRoutes.post('/estudante', zValidator('json', RegistoEstudantePayloadSchema), async (c) => {
  const {
    email,
    password,
    nome,
    areaInteresse,
    nivelEnsino,
    dataNascimento,
    consentimentoEncarregado,
    aceiteLegal,
  } = c.req.valid('json');
  try {
    const user = await authService.registerWithRole(email, password, nome, 'estudante', { 
      areasInteresse: [areaInteresse], 
      nivelEnsino 
    }, {
      aceiteLegal,
      dataNascimento,
      ...(consentimentoEncarregado !== undefined ? { consentimentoEncarregado } : {}),
      source: 'registo_email',
    });
    return await initiate2faChallenge(c, user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return c.json({ error: message }, getRegisterErrorStatus(err));
  }
});

registerRoutes.post('/mentor', zValidator('json', RegistoMentorPayloadSchema), async (c) => {
  const { email, password, nome, areaEspecialidade, documentos, aceiteLegal } = c.req.valid('json');
  try {
    const user = await authService.registerWithRole(email, password, nome, 'mentor', { 
      areaFormacao: areaEspecialidade, 
      documentos: documentos ?? [], 
      aprovado: false 
    }, {
      aceiteLegal,
      source: 'registo_email',
    });
    return await initiate2faChallenge(c, user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return c.json({ error: message }, getRegisterErrorStatus(err));
  }
});

registerRoutes.post('/instituicao', zValidator('json', RegistoInstituicaoPayloadSchema), async (c) => {
  const { nome, email, password, regiao, tipo, documentos, aceiteLegal } = c.req.valid('json');
  try {
    const user = await authService.registerWithRole(email, password, nome, 'instituicao', { 
      regiao, 
      tipoInstituicao: tipo, 
      documentos: documentos ?? [], 
      aprovado: false 
    }, {
      aceiteLegal,
      source: 'registo_email',
    });
    try {
      await provisionInstituicaoForUser(user.id, {
        nome,
        tipo,
        ...(regiao !== undefined ? { regiao } : {}),
        ...(documentos !== undefined ? { documentos } : {}),
      });
    } catch (error) {
      try {
        await authService.rollbackRegistration(user.id);
      } catch (rollbackError) {
        log.error({ rollbackError, userId: user.id }, 'Falha na compensação do registo institucional');
      }
      throw error;
    }
    return await initiate2faChallenge(c, user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return c.json({ error: message }, getRegisterErrorStatus(err));
  }
});
