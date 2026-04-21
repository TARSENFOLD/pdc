import { strapiGet } from '../strapi/strapi.client.js';
import { ltiTokenService } from './lti.token.service.js';
import { ltiAgsService } from './lti.ags.js';
import type { PerfilCompleto } from '@pdc/shared';

export interface LtiScoreResult {
  status: 'sent' | 'skipped' | 'retryable_error';
  reason?: string;
}

interface PerfilWithLti extends PerfilCompleto {
  lti_context?: {
    lineitemUrl?: string;
    iss?: string;
  };
  ltiSub?: string;
  userId?: string;
}

export const ltiScoreService = {
  async sendScoreFromContext(perfilId: string, _tentativaId: string, score: number): Promise<LtiScoreResult> {
    try {
      // 1. Buscar perfil e contexto LTI
      const resPerfil = await strapiGet<PerfilWithLti>(`/perfis/${perfilId}`);
      
      const perfil = resPerfil.data[0];
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
      const accessToken = await ltiTokenService.getAccessToken(String(plataforma.id));

      // 3. Enviar via AGS
      await ltiAgsService.sendScore(ltiContext.lineitemUrl, {
        userId: perfil.ltiSub || perfil.userId || String(perfil.id),
        scoreGiven: score,
        scoreMaximum: 100,
        activityProgress: 'Completed',
        gradingProgress: 'FullyGraded',
        timestamp: new Date().toISOString(),
      }, accessToken);

      return { status: 'sent' };
    } catch (err) {
      console.error('LTI Score Service Error:', err);
      throw err;
    }
  }
};
