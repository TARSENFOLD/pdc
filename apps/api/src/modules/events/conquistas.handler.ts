import pino from 'pino';
import { conquistaEngine } from '../conquistas/conquistas.engine.js';
import type { DomainEvent } from './types.js';
import { strapiGet } from '../strapi/strapi.client.js';
import { socketService } from '../realtime/socket.service.js';

const log = pino({ name: 'conquistas-handler' });

/**
 * Event-driven Achievements Handler
 * Reage a Domain Events e avalia se o utilizador desbloqueou medalhas.
 */
export async function conquistasHandler(event: DomainEvent): Promise<void> {
  const payload = event.payload as { perfilId?: string; autorId?: string; tentativaId?: string };
  const perfilId = payload.perfilId || payload.autorId;

  if (!perfilId) return;

  try {
    // 1. Procurar o userId vinculado ao perfil (Engine usa userId do Clerk/Strapi-Auth)
    const resPerfil = await strapiGet<{ userId: string }>('/perfis', {
      'filters[id][$eq]': perfilId,
      'fields[0]': 'userId',
    });

    const userRecord = resPerfil.data[0];
    const userId = userRecord?.userId;

    if (!userId) {
      log.debug({ perfilId }, 'Perfil não tem userId associado, ignorando conquistas automáticas');
      return;
    }

    // 2. Avaliar regras
    const desbloqueadas = await conquistaEngine.verificarConquistas(
      userId,
      event.name,
      payload.tentativaId,
    );

    // 3. Notificar via Socket (Realtime Feedback)
    if (desbloqueadas.length > 0) {
      desbloqueadas.forEach((c) => {
        socketService.emitirConquista(userId, c);
      });
      log.info({ userId, count: desbloqueadas.length }, 'Novas conquistas desbloqueadas via evento');
    }
  } catch (err: unknown) {
    log.error({ err, event: event.name }, 'Falha no processamento de conquistas');
  }
}
