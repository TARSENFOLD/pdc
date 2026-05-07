import pino from 'pino';
import { strapiGet } from '../strapi/strapi.client.js';
import { ltiTokenService } from './lti.token.service.js';
import { ltiAgsService } from './lti.ags.js';
import type { PerfilCompleto, LtiScoreResult } from '@pdc/shared';

const log = pino({ name: 'lti-score-service' });



interface PerfilWithLti extends PerfilCompleto {
  lti_context?: {
    lineitemUrl?: string;
    iss?: string;
  };
  ltiSub?: string;
  userId?: string;
}

export const ltiScoreService = {
  sendScoreFromContext: async (perfilId: string, tentativaId: string, score: number): Promise<LtiScoreResult> => {
    try {
      // 1. Buscar perfil e contexto LTI
      const resPerfil = await strapiGet<PerfilWithLti>(`/perfis/${perfilId}`);
      
      // /perfis/:id retorna lista com 1 elemento via Strapi REST
      const perfil = Array.isArray(resPerfil.data) ? resPerfil.data[0] : resPerfil.data;
      if (!perfil) return { status: 'retryable_error', reason: 'perfil-not-found' };

      const ltiContext = perfil.lti_context;
      if (!ltiContext || !ltiContext.lineitemUrl) {
        return { status: 'skipped', reason: 'no-lti-context' };
      }

      // Procurar plataforma pelo issuer guardado no contexto
      const iss = ltiContext.iss;
      if (!iss) return { status: 'retryable_error', reason: 'no-issuer-in-context' };

      const resPlat = await strapiGet<{ id: string | number }>('/lti-plataformas', {
        'filters[issuer][$eq]': iss,
        'filters[ativo][$eq]': 'true',
      });
      
      const plataforma = resPlat.data[0];
      if (!plataforma) {
        return { status: 'retryable_error', reason: 'plataforma-not-found' };
      }

      // 2. Obter Token
      const accessToken = await ltiTokenService.getAccessToken(plataforma.id.toString());

      // 3. Enviar via AGS
      await ltiAgsService.sendScore(ltiContext.lineitemUrl, {
        userId: perfil.ltiSub || perfil.userId || perfil.id,
        activityId: tentativaId,
        scoreGiven: score,
        scoreMaximum: 100,
        activityProgress: 'Completed',
        gradingProgress: 'FullyGraded',
        timestamp: new Date().toISOString(),
      }, accessToken);

      return { status: 'sent' };
    } catch (err) {
      log.error({ err: err instanceof Error ? err.message : String(err), perfilId, tentativaId }, 'LTI Score Service Error');
      throw err;
    }
  },
};
