import pino from 'pino';

const log = pino({ name: 'lti:ags' });

export interface LtiScore {
  scoreGiven: number;
  scoreMaximum: number;
  activityProgress: 'Initialized' | 'Started' | 'InProgress' | 'Submitted' | 'Completed';
  gradingProgress: 'FullyGraded' | 'Pending' | 'PendingManual' | 'Failed' | 'NotReady';
  timestamp: string;
}

export const ltiAgsService = {
  /**
   * Envia o score via LTI Advantage AGS (Assignment and Grading Service)
   */
  async sendScore(perfilId: string, score: LtiScore): Promise<void> {
    log.info({ perfilId, score }, 'Simulação de envio de score LTI AGS');
    // Implementação real requer tokens de linha LTI que seriam buscados do Strapi
    return Promise.resolve();
  }
};
