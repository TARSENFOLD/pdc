import pino from 'pino';
import { z } from 'zod';
import { hasPrimaryRedis, redis } from '../../lib/redis.js';
import { strapiGet } from '../strapi/strapi.client.js';
import {
  canExposeExperience,
  filterVwxExperiences,
  isVwxCatalogEnabled,
} from '../feature-flags/vwx-catalog-gate.js';

const log = pino({ name: 'ai-rag' });
const RAG_CONTENT_CACHE_KEY = 'rag:conteudo:v2';
const BaseContentItemSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
});
const ContentItemSchema = z.discriminatedUnion('tipo', [
  BaseContentItemSchema.extend({ tipo: z.literal('curso') }),
  BaseContentItemSchema.extend({
    tipo: z.literal('experiencia'),
    tipoExperiencia: z.enum(['institucional', 'vwx']),
  }),
]);
const ContentItemsSchema = z.array(ContentItemSchema);
type ContentItem = z.infer<typeof ContentItemSchema>;

interface RagCourse {
  id: number;
  titulo: string;
  descricao: string;
}

interface RagExperience extends RagCourse {
  tipoExperiencia?: 'institucional' | 'vwx';
}

function normalizeExperienceVariant(
  tipoExperiencia: RagExperience['tipoExperiencia'],
): 'institucional' | 'vwx' {
  return tipoExperiencia === 'vwx' ? 'vwx' : 'institucional';
}

function filterVwxContent(items: ContentItem[], vwxCatalogEnabled: boolean): ContentItem[] {
  return items.filter((item) => (
    item.tipo === 'curso' || canExposeExperience(item, vwxCatalogEnabled)
  ));
}

export const aiRag = {
  async indexarConteudo(): Promise<void> {
    if (!hasPrimaryRedis) return;

    // Fix: Strapi client already flattens and wraps in data array.
    // Removed nested { data: ... } and attributes access.
    const [cursosRes, experienciasRes, vwxCatalogEnabled] = await Promise.all([
      strapiGet<RagCourse>('/cursos'),
      strapiGet<RagExperience>('/experiencias'),
      isVwxCatalogEnabled(),
    ]);
    const visibleExperiencias = filterVwxExperiences(
      experienciasRes.data,
      vwxCatalogEnabled,
    );

    const items: ContentItem[] = [
      ...cursosRes.data.map(c => ({
        id: c.id.toString(),
        titulo: c.titulo,
        descricao: c.descricao,
        tipo: 'curso' as const,
      })),
      ...visibleExperiencias.map(e => ({
        id: e.id.toString(),
        titulo: e.titulo,
        descricao: e.descricao,
        tipo: 'experiencia' as const,
        tipoExperiencia: normalizeExperienceVariant(e.tipoExperiencia),
      })),
    ];

    await redis.set(RAG_CONTENT_CACHE_KEY, items);
  },

  async buscarContextoRelevante(query: string): Promise<string> {
    if (!hasPrimaryRedis) return '';
    let items: ContentItem[];
    try {
      const rawData = await redis.get<unknown>(RAG_CONTENT_CACHE_KEY);
      if (!rawData) return '';
      const normalized: unknown = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      items = ContentItemsSchema.parse(normalized);
    } catch (error: unknown) {
      log.warn({ error }, 'Cache RAG indisponível ou inválido; IA continuará sem contexto');
      return '';
    }
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    const visibleItems = filterVwxContent(items, await isVwxCatalogEnabled());
    const relevant = visibleItems
      .filter(item => {
        const text = `${item.titulo} ${item.descricao}`.toLowerCase();
        return words.some(word => text.includes(word));
      })
      .slice(0, 3);

    if (relevant.length === 0) return '';

    return `Informação relevante da plataforma: ${relevant.map(r => `[${r.tipo}] ${r.titulo}: ${r.descricao}`).join(' | ')}`;
  },
};
