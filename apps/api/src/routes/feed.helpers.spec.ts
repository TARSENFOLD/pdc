import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCandidates, toFeedItem, type StrapiEntity, type ItemStats } from './feed.helpers.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import type { FeedItemTipo, StrapiListResponse } from '@pdc/shared';
import { featureFlagService } from '../modules/feature-flags/feature-flags.service.js';

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
}));

vi.mock('../lib/redis.js', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../modules/feature-flags/feature-flags.service.js', () => ({
  featureFlagService: {
    isEnabled: vi.fn(),
  },
}));

function listResponse<T extends { id: string | number }>(data: T[]): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

describe('feed helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(featureFlagService.isEnabled).mockResolvedValue(true);
  });

  it('inclui apenas feed-posts aprovados como candidatos do feed', async () => {
    vi.mocked(strapiGet).mockImplementation((path: string) => {
      if (path === '/cursos' || path === '/simulacoes' || path === '/experiencias') {
        return Promise.resolve(listResponse<StrapiEntity>([]));
      }

      if (path === '/feed-posts') {
        return Promise.resolve(
          listResponse<StrapiEntity>([
            {
              id: 'post-1',
              corpo: 'Publicação aprovada',
              estado: 'aprovada',
              createdAt: '2026-04-30T10:00:00.000Z',
              autor: { id: 'perfil-1', userId: 'user-1', nome: 'Ana PDC' },
            },
            {
              id: 'post-2',
              corpo: 'Publicação pendente',
              estado: 'pendente_moderacao',
              createdAt: '2026-04-30T10:01:00.000Z',
            },
            {
              id: 'post-3',
              corpo: 'Publicação oculta',
              estado: 'hidden',
              createdAt: '2026-04-30T10:02:00.000Z',
            },
          ])
        );
      }

      return Promise.resolve(listResponse<StrapiEntity>([]));
    });

    const candidates = await fetchCandidates();

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      id: 'post-1',
      tipo: 'post',
      estado: 'aprovada',
    });
  });

  it('consulta programas e projetos com populates declarados no schema Strapi', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse<StrapiEntity>([]));

    await fetchCandidates();

    expect(strapiGet).toHaveBeenCalledWith('/programas', expect.objectContaining({
      populate: 'capa,instituicao,responsavel',
    }));
    expect(strapiGet).toHaveBeenCalledWith('/projetos', expect.objectContaining({
      populate: 'autor,media',
    }));
  });

  it('mantem conteudo approved como candidato visivel no feed/home', async () => {
    vi.mocked(strapiGet).mockImplementation((path: string) => {
      if (path === '/cursos') {
        return Promise.resolve(
          listResponse<StrapiEntity>([
            {
              id: 'curso-approved',
              titulo: 'Curso aprovado',
              estado: 'approved',
              visibilidade: 'publico',
              createdAt: '2026-04-30T10:00:00.000Z',
            },
            {
              id: 'curso-hidden',
              titulo: 'Curso oculto',
              estado: 'hidden',
              visibilidade: 'publico',
              createdAt: '2026-04-30T10:01:00.000Z',
            },
          ])
        );
      }

      if (path === '/feed-posts') {
        return Promise.resolve(listResponse<StrapiEntity>([]));
      }

      return Promise.resolve(listResponse<StrapiEntity>([]));
    });

    const candidates = await fetchCandidates();

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      id: 'curso-approved',
      tipo: 'curso',
      estado: 'approved',
    });
  });

  it('não inclui experiências VWX nos candidatos do feed com catálogo desligado', async () => {
    vi.mocked(featureFlagService.isEnabled).mockResolvedValue(false);
    vi.mocked(strapiGet).mockImplementation((path: string) => {
      if (path === '/experiencias') {
        return Promise.resolve(listResponse<StrapiEntity>([
          {
            id: 'exp-institucional',
            tipoExperiencia: 'institucional',
            estado: 'published',
            visibilidade: 'publico',
            createdAt: '2026-07-30T10:00:00.000Z',
          },
          {
            id: 'exp-vwx',
            tipoExperiencia: 'vwx',
            estado: 'published',
            visibilidade: 'publico',
            createdAt: '2026-07-30T10:00:00.000Z',
          },
        ]));
      }
      return Promise.resolve(listResponse<StrapiEntity>([]));
    });

    const candidates = await fetchCandidates();

    expect(candidates.map((candidate) => candidate.id)).toEqual(['exp-institucional']);
  });

  it('mapeia feed-post aprovado para FeedItem social', () => {
    const stats: ItemStats = { likes: 3, comentarios: 2, shares: 1, ratingMedia: 0, ratingTotal: 0 };
    const entity: StrapiEntity & { tipo: FeedItemTipo } = {
      id: 'post-1',
      tipo: 'post',
      corpo: 'Texto social real',
      mediaUrls: ['https://cdn.pdc.test/post.jpg'],
      autor: {
        id: 'perfil-1',
        userId: 'user-1',
        nome: 'Ana PDC',
        foto: { url: 'https://cdn.pdc.test/avatar.jpg' },
      },
      estado: 'aprovada',
      createdAt: '2026-04-30T10:00:00.000Z',
    };

    expect(toFeedItem(entity, stats, 0.8, 0.9)).toMatchObject({
      id: 'post-1',
      tipo: 'post',
      userId: 'user-1',
      titulo: 'Texto social real',
      corpo: 'Texto social real',
      autorNome: 'Ana PDC',
      avatar: 'https://cdn.pdc.test/avatar.jpg',
      imagem: 'https://cdn.pdc.test/post.jpg',
      stats: { likes: 3, comentarios: 2, shares: 1, ratingMedia: 0, ratingTotal: 0 },
    });
  });

  it('deriva titulo e userId de campos reais quando nao ha titulo explicito', () => {
    const stats: ItemStats = { likes: 0, comentarios: 0, shares: 0, ratingMedia: 0, ratingTotal: 0 };
    const entity: StrapiEntity & { tipo: FeedItemTipo } = {
      id: 'curso-1',
      tipo: 'curso',
      descricao: 'Curso publicado sem titulo vindo do CMS',
      estado: 'published',
      visibilidade: 'publico',
      createdAt: '2026-04-30T10:00:00.000Z',
    };

    expect(toFeedItem(entity, stats, 0.2, 0.4)).toMatchObject({
      id: 'curso-1',
      userId: 'curso-1',
      titulo: 'Curso publicado sem titulo vindo do CMS',
      corpo: 'Curso publicado sem titulo vindo do CMS',
    });
  });
});
