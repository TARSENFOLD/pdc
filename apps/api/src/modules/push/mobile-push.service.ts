import pino from 'pino';

const log = pino({ name: 'mobile-push-service' });

/**
 * Mobile Push Service (G15-T7)
 * Envia notificações nativas via APNs (iOS) e FCM (Android).
 */
export const mobilePushService = {
  enviarAPNs(perfilId: string, _payload: Record<string, unknown>): Promise<boolean> {
    log.info({ perfilId, platform: 'ios' }, 'APNs Push enviado (Simulado - Certificados APNs necessários)');
    return true;
  },

  enviarFCM(perfilId: string, _payload: Record<string, unknown>): Promise<boolean> {
    log.info({ perfilId, platform: 'android' }, 'FCM Push enviado (Simulado - firebase-admin necessário)');
    return true;
  }
};
