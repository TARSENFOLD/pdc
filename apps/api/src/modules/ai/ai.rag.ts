import { Redis } from '@upstash/redis';
import { strapiGet } from '../strapi/strapi.client.js';
import { env } from '../../lib/env.js';

const redis = env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

interface ContentItem {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'curso' | 'experiencia';
}

export const aiRag = {
  async indexarConteudo(): Promise<void> {
    if (!redis) return;

    const cursosRes = await strapiGet<{ data: Array<{ id: number; attributes: { titulo: string; descricao: string } }> }>('/cursos');
    const experienciasRes = await strapiGet<{ data: Array<{ id: number; attributes: { titulo: string; descricao: string } }> }>('/experiencias');

    const items: ContentItem[] = [
      ...cursosRes.data.map(c => ({
        id: c.id.toString(),
        titulo: c.attributes.titulo,
        descricao: c.attributes.descricao,
        tipo: 'curso' as const,
      })),
      ...experienciasRes.data.map(e => ({
        id: e.id.toString(),
        titulo: e.attributes.titulo,
        descricao: e.attributes.descricao,
        tipo: 'experiencia' as const,
      })),
    ];

    await redis.set('rag:conteudo', JSON.stringify(items));
  },

  async buscarContextoRelevante(query: string): Promise<string> {
    if (!redis) return '';

    const rawData = await redis.get<string>('rag:conteudo');
    if (!rawData) return '';

    const items = (typeof rawData === 'string' ? JSON.parse(rawData) : rawData) as ContentItem[];
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
