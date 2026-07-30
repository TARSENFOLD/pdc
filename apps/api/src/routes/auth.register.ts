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
import { DuplicateEmailError } from '../modules/auth/auth.errors.js';
import { requireExternalCreatorOnboarding } from '../modules/feature-flags/cor-0001-gates.js';

export const registerRoutes = new Hono<{ Variables: AuthVariables }>();
const log = pino({ name: 'auth-register' });

registerRoutes.use('/*', rateLimitRegisto);

export function getRegisterErrorDetails(err: unknown): {
  status: 409 | 502;
  message: string;
} {
  if (err instanceof DuplicateEmailError) {
    return {
      status: 409,
      message: 'Já existe uma conta com este email. Inicia sessão ou usa recuperação de palavra-passe.',
    };
  }
  return { status: 502, message: 'Serviço de registo temporariamente indisponível' };
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
    const { status, message } = getRegisterErrorDetails(err);
    return c.json({ error: message }, status);
  }
});

registerRoutes.post('/mentor', requireExternalCreatorOnboarding(), zValidator('json', RegistoMentorPayloadSchema), async (c) => {
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
    const { status, message } = getRegisterErrorDetails(err);
    return c.json({ error: message }, status);
  }
});

registerRoutes.post('/instituicao', requireExternalCreatorOnboarding(), zValidator('json', RegistoInstituicaoPayloadSchema), async (c) => {
  const { nome, nomeInstituicao, email, password, regiao, tipo, nif, aceiteLegal } = c.req.valid('json');
  try {
    const user = await authService.registerWithRole(email, password, nome, 'instituicao', {
      aprovado: false 
    }, {
      aceiteLegal,
      source: 'registo_email',
    });
    try {
      await provisionInstituicaoForUser(user.id, {
        nome: nomeInstituicao,
        nomeLegal: nomeInstituicao,
        tipo,
        nif,
        ...(regiao !== undefined ? { regiao } : {}),
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
    const { status, message } = getRegisterErrorDetails(err);
    return c.json({ error: message }, status);
  }
});
