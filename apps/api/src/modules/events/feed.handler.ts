import pino from 'pino';
import { strapiPost } from '../strapi/strapi.client.js';
import { DomainEventName, type DomainEvent } from './types.js';

const log = pino({ name: 'feed-handler' });

/**
 * Handler de Impacto no Feed (Camada 5 - E2E)
 * Transforma eventos de conteúdo em publicações sociais automáticas.
 */
export async function feedHandler(event: DomainEvent<{ 
  cursoId: string | number; 
  autorId: string; 
  titulo: string;
  area: string;
}>): Promise<void> {
  
  if (event.name === DomainEventName.CURSO_PUBLICADO) {
    try {
      log.info({ cursoId: event.payload.cursoId }, 'Injetando curso no Feed Vocacional');
      
      await strapiPost('/posts', {
        titulo: `Novo Curso: ${event.payload.titulo}`,
        tipo: 'institucional',
        conteudo: `O mentor materializou um novo percurso na área de ${event.payload.area}. Explora agora no catálogo.`,
        autor: event.payload.autorId,
        metadata: {
          entidadeTipo: 'curso',
          entidadeId: event.payload.cursoId,
          evento: event.name
        },
        estado: 'published',
        publishedAt: new Date().toISOString(),
      });
      
    } catch (err) {
      log.error({ err, cursoId: event.payload.cursoId }, 'Falha ao injetar impacto no Feed');
      throw err; // Outbox fará o retry
    }
  }
}
