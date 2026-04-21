import pino from 'pino';
import type { DomainEvent } from './types.js';
import { strapiPost } from '../strapi/strapi.client.js';

const log = pino({ name: 'feed-handler' });

/**
 * Feed Integration Handler
 * @deprecated Substituído pelo feedHook (G15). Mantido por 1 release para compatibilidade.
 */
export async function feedHandler(event: DomainEvent): Promise<void> {
  const payload = event.payload as { cursoId: string | number; autorId: string; titulo: string; area: string };
  
  try {
    log.info({ cursoId: payload.cursoId }, 'A propagar curso para feed social (Legacy)');
    
    // Invariante: Todo curso publicado gera um Post automático no Feed Institucional
    await strapiPost('/posts', {
      titulo: `Novo Curso: ${payload.titulo}`,
      tipo: 'institucional',
      conteudo: `O mentor materializou um novo percurso na área de ${payload.area}. Explora agora no catálogo.`,
      autor: payload.autorId,
      referenciaTipo: 'curso',
      referenciaId: String(payload.cursoId),
      publicadoEm: new Date().toISOString(),
      estado: 'published'
    });

  } catch (err: unknown) {
    log.error({ err, cursoId: payload.cursoId }, 'Falha ao propagar curso para o feed');
  }
}
