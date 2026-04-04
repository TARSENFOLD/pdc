import { strapiGet } from '../strapi/strapi.client.js';
import { redis } from '../../lib/redis.js';
import type { FeedItem, FeedWeights, FeedItemTipo } from '@pdc/shared';

interface StrapiEntity {
  id: string | number;
  slug?: string;
  titulo?: string;
  descricao?: string;
  capaUrl?: string;
  area?: string;
  autorNome?: string;
  instituicaoNome?: string;
  aluno?: { nome: string };
  createdAt: string;
  publishedAt?: string;
}

interface StrapiList<T> {
  data: T[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

const DEFAULT_WEIGHTS: FeedWeights = {
  engagement: 0.20,
  completion: 0.20,
  rating: 0.15,
  recency: 0.15,
  reputation: 0.10,
  affinity: 0.10,
  time: 0.10,
};

interface ItemStats {
  likes: number;
  ratingMedia: number;
  ratingTotal: number;
}

export const feedService = {
  CACHE_TTL: 15 * 60, // 15 minutes

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getFeed(page = 1, pageSize = 10, _userId?: string): Promise<FeedItem[]> {
    const cacheKey = `feed:general:${String(page)}:${String(pageSize)}`;
    
    if (redis) {
      const cached = await redis.get<FeedItem[]>(cacheKey);
      if (cached) return cached;
    }

    // 1. Geração de Candidatos (V1: Simples fetch dos mais recentes)
    const [cursos, simulacoes, experiencias, projetos] = await Promise.all([
      strapiGet<StrapiList<StrapiEntity>>('/cursos', { 'pagination[limit]': '20', sort: 'publishedAt:desc', populate: 'capa,autor' }),
      strapiGet<StrapiList<StrapiEntity>>('/simulacoes', { 'pagination[limit]': '20', sort: 'publishedAt:desc', populate: 'capa' }),
      strapiGet<StrapiList<StrapiEntity>>('/experiencias', { 'pagination[limit]': '20', sort: 'publishedAt:desc', populate: 'capa,instituicao' }),
      strapiGet<StrapiList<StrapiEntity>>('/projetos', { 'pagination[limit]': '20', sort: 'createdAt:desc', populate: 'imagem,aluno' }),
    ]);

    const candidates: (StrapiEntity & { tipo: FeedItemTipo })[] = [
      ...cursos.data.map(d => ({ ...d, tipo: 'curso' as const })),
      ...simulacoes.data.map(d => ({ ...d, tipo: 'simulacao' as const })),
      ...experiencias.data.map(d => ({ ...d, tipo: 'experiencia' as const })),
      ...projetos.data.map(d => ({ ...d, tipo: 'projeto' as const })),
    ];

    // 2. Hidratação e Scoring
    const feedItems: FeedItem[] = await Promise.all(
      candidates.map(async (c) => {
        const stats: ItemStats = await feedService.getItemStats(c.tipo, String(c.id));
        const recencyScore = feedService.calculateRecencyScore(c.publishedAt || c.createdAt, c.tipo);
        
        // V1 Scoring simplificado
        const engagementScore = (stats.likes * 2 + stats.ratingTotal * 5) / 100; // Normalizado grosseiramente
        const ratingScore = stats.ratingMedia / 5;
        
        const score = (
          engagementScore * DEFAULT_WEIGHTS.engagement +
          ratingScore * DEFAULT_WEIGHTS.rating +
          recencyScore * DEFAULT_WEIGHTS.recency
        );

        return {
          tipo: c.tipo,
          id: String(c.id),
          slug: c.slug,
          titulo: c.titulo || '',
          descricao: c.descricao || '',
          capaUrl: c.capaUrl,
          area: c.area,
          autorNome: c.autorNome || c.instituicaoNome || c.aluno?.nome,
          score,
          recencyScore,
          stats,
          publicadoEm: c.publishedAt || c.createdAt,
        };
      })
    );

    // 3. Ranking e Paginação
    const sorted = feedItems.sort((a, b) => b.score - a.score);
    const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

    if (redis && paginated.length > 0) {
      await redis.set(cacheKey, paginated, { ex: feedService.CACHE_TTL });
    }

    return paginated;
  },

  async getTrendingFeed(): Promise<FeedItem[]> {
    const cacheKey = 'feed:trending';
    
    if (redis) {
      const cached = await redis.get<FeedItem[]>(cacheKey);
      if (cached) return cached;
    }

    // Similar ao geral mas com pesos diferentes e janela de 48h
    // V1: Vamos apenas buscar o top do geral por agora com foco em engagement
    const all = await feedService.getFeed(1, 50);
    const trending = all
      .sort((a, b) => (b.stats.likes + b.stats.ratingTotal) - (a.stats.likes + a.stats.ratingTotal))
      .slice(0, 10);

    if (redis && trending.length > 0) {
      await redis.set(cacheKey, trending, { ex: 3600 }); // 1h
    }

    return trending;
  },

  async getItemStats(tipo: FeedItemTipo, id: string): Promise<ItemStats> {
    try {
      // V1: Fetch real das tabelas de interações
      const [likes, ratings] = await Promise.all([
        strapiGet<{ meta: { pagination: { total: number } } }>('/likes', {
          'filters[targetType][$eq]': tipo,
          'filters[targetId][$eq]': id,
          'pagination[limit]': '1',
        }),
        strapiGet<StrapiList<{ valor: number }>>('/ratings', {
          'filters[targetType][$eq]': tipo,
          'filters[targetId][$eq]': id,
          'pagination[limit]': '100',
        }),
      ]);

      const ratingValues = ratings.data.map(r => r.valor);
      const ratingTotal = ratingValues.length;
      const ratingMedia = ratingTotal > 0 ? ratingValues.reduce((a, b) => a + b, 0) / ratingTotal : 0;

      return {
        likes: likes.meta.pagination.total || 0,
        ratingMedia,
        ratingTotal,
      };
    } catch {
      return { likes: 0, ratingMedia: 0, ratingTotal: 0 };
    }
  },

  calculateRecencyScore(dateStr: string, tipo: FeedItemTipo): number {
    const publishedAt = new Date(dateStr).getTime();
    const now = Date.now();
    const hoursOld = (now - publishedAt) / (1000 * 60 * 60);
    
    // recency_score = 1 / (1 + horas_desde_publicacao ^ 1.5)
    // Exceção: Simulações e Experiências têm decaimento mais lento (expoente 1.0)
    const exponent = (tipo === 'simulacao' || tipo === 'experiencia') ? 1.0 : 1.5;
    return 1 / (1 + Math.pow(Math.max(0, hoursOld), exponent));
  },
};
