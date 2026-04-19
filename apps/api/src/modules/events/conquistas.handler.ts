import pino from 'pino';
import { conquistaEngine } from '../conquistas/conquistas.engine.js';
import type { DomainEvent } from './types.js';
import { strapiGet } from '../strapi/strapi.client.js';
import type { StrapiPerfil } from '../strapi/strapi.types.js';
import { socketService } from '../realtime/socket.service.js';

const log = pino({ name: 'conquistas-handler' });

/**
 * Handler de Conquistas (Refactored R2.T3b)
 * Dispara a verificação de conquistas automáticas após eventos de domínio.
 */
export async function conquistasHandler(event: DomainEvent<{ tentativaId: string; perfilId: string }>) {
  const { perfilId, tentativaId } = event.payload;

  try {
    // 1. Resolve userId do perfilId (Engine exige userId Clerk/Strapi)
    const resPerfil = await strapiGet<StrapiPerfil>('/perfis', {
      'filters[id][$eq]': perfilId,
      'fields[0]': 'userId'
    });
    
    const perfil = resPerfil.data[0];
    const userId = perfil?.userId;
    if (!userId) throw new Error(`UserId não encontrado para perfilId ${perfilId}`);

    // 2. Chama a engine de conquistas (Sovereign & Idempotente)
    // Usa o nome do evento original para decidir quais regras aplicar
    const novasConquistas = await conquistaEngine.verificarConquistas(userId, event.name, tentativaId);
    
    // 3. Emite evento de tempo real para celebração imediata (The Nervous System)
    if (novasConquistas.length > 0) {
      for (const conquista of novasConquistas) {
        socketService.emitirConquista(userId, conquista);
      }
    }
    
    log.info({ userId, perfilId, event: event.name, count: novasConquistas.length }, 'Processamento de conquistas concluído com sucesso.');
  } catch (err) {
    log.error({ err, perfilId }, 'Falha ao processar conquistas');
    // Propagamos o erro para garantir que o EventBus não marque o evento como processado (retry)
    throw err;
  }
}
