import pino from 'pino';
import { z } from 'zod';
import { hasPrimaryRedis, redis } from '../../lib/redis.js';
import { strapiGet } from '../strapi/strapi.client.js';

const log = pino({ name: 'ai-rag' });
const ContentItemSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  tipo: z.enum(['curso', 'experiencia']),
});
const ContentItemsSchema = z.array(ContentItemSchema);
type ContentItem = z.infer<typeof ContentItemSchema>;

export const aiRag = {
  async indexarConteudo(): Promise<void> {
    if (!hasPrimaryRedis) return;

    // Fix: Strapi client already flattens and wraps in data array.
    // Removed nested { data: ... } and attributes access.
    const cursosRes = await strapiGet<{ id: number; titulo: string; descricao: string }>('/cursos');
    const experienciasRes = await strapiGet<{ id: number; titulo: string; descricao: string }>('/experiencias');

    const items: ContentItem[] = [
      ...cursosRes.data.map(c => ({
        id: c.id.toString(),
        titulo: c.titulo,
        descricao: c.descricao,
        tipo: 'curso' as const,
      })),
      ...experienciasRes.data.map(e => ({
        id: e.id.toString(),
        titulo: e.titulo,
        descricao: e.descricao,
        tipo: 'experiencia' as const,
      })),
    ];

    await redis.set('rag:conteudo', items);
  },

  async buscarContextoRelevante(query: string): Promise<string> {
    if (!hasPrimaryRedis) return '';
    let items: ContentItem[];
    try {
      const rawData = await redis.get<unknown>('rag:conteudo');
      if (!rawData) return '';
      const normalized: unknown = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      items = ContentItemsSchema.parse(normalized);
    } catch (error: unknown) {
      log.warn({ error }, 'Cache RAG indisponível ou inválido; IA continuará sem contexto');
      return '';
    }
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    const relevant = items
      .filter(item => {
        const text = `${item.titulo} ${item.descricao}`.toLowerCase();
        return words.some(word => text.includes(word));
      })
      .slice(0, 3);

    if (relevant.length === 0) return '';

    return `Informação relevante da plataforma: ${relevant.map(r => `[${r.tipo}] ${r.titulo}: ${r.descricao}`).join(' | ')}`;
  },
};
