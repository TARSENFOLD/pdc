import { describe, it, expect, vi, beforeEach } from 'vitest';
import { conquistaEngine } from './conquistas.engine.js';
import { strapiGet, strapiPost } from '../strapi/strapi.client.js';
import { type StrapiListResponse, type StrapiSingleResponse, DomainEventName } from '@pdc/shared';

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
}));

vi.mock('../feature-flags/feature-flags.service.js', () => ({
  featureFlagService: {
    getEffectiveFlags: vi.fn().mockResolvedValue({ AUTO_ACHIEVEMENTS: true }),
  },
}));

function listResponse<T extends { id: string | number }>(data: T[]): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: data.length } },
  };
}

function postResponse<T extends { id: string | number }>(data: T): StrapiSingleResponse<T> {
  return { data, meta: {} };
}

describe('ConquistaEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve desbloquear a primeira simulação', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([])); // Conquistas já existentes
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{ id: '1', status: 'concluida' }])); // Tentativas
    vi.mocked(strapiPost).mockResolvedValueOnce(postResponse({ id: 'new-1', slug: 'primeira-simulacao' }));

    const unlocked = await conquistaEngine.verificarConquistas('user-1', 'tentativa.concluida');
    expect(unlocked).toHaveLength(1);
    expect(unlocked[0]?.slug).toBe('primeira-simulacao');
  });

  it('deve desbloquear programa-completo ao concluir programa (não ao aprovar)', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([])); // not yet unlocked
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{ id: '5' }])); // 1 programa.concluido telemetria
    vi.mocked(strapiPost).mockResolvedValueOnce(postResponse({ id: 'new-2', slug: 'programa-completo' }));

    const unlocked = await conquistaEngine.verificarConquistas('user-1', DomainEventName.PROGRAMA_CONCLUIDO);
    expect(unlocked.some(c => c.slug === 'programa-completo')).toBe(true);
  });

  it('programa-completo NÃO dispara em PROGRAMA_APROVADO (evento de moderador)', async () => {
    const unlocked = await conquistaEngine.verificarConquistas('user-1', DomainEventName.PROGRAMA_APROVADO);
    expect(unlocked.some(c => c.slug === 'programa-completo')).toBe(false);
  });

  it('deve desbloquear primeiro-endorsement ao receber endorsement (não ao publicar projeto)', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([])); // not yet unlocked
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{ id: '6' }])); // 1 endorsement telemetria
    vi.mocked(strapiPost).mockResolvedValueOnce(postResponse({ id: 'new-3', slug: 'primeiro-endorsement' }));

    const unlocked = await conquistaEngine.verificarConquistas('user-1', DomainEventName.PROJETO_ENDORSEMENT_RECEBIDO);
    expect(unlocked.some(c => c.slug === 'primeiro-endorsement')).toBe(true);
  });

  it('primeiro-endorsement NÃO dispara em PROJETO_PUBLICADO', async () => {
    // PROJETO_PUBLICADO dispara 'primeiro-projeto', não 'primeiro-endorsement'
    vi.mocked(strapiGet).mockResolvedValue(listResponse([]));
    vi.mocked(strapiPost).mockResolvedValue(postResponse({ id: 'x', slug: 'x' }));

    const unlocked = await conquistaEngine.verificarConquistas('user-1', DomainEventName.PROJETO_PUBLICADO);
    expect(unlocked.some(c => c.slug === 'primeiro-endorsement')).toBe(false);
  });

  it('deve desbloquear colaborador-projeto ao receber acesso concedido (não ao publicar projeto)', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([])); // not yet unlocked
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{ id: '7' }])); // 1 acesso_concedido telemetria
    vi.mocked(strapiPost).mockResolvedValueOnce(postResponse({ id: 'new-4', slug: 'colaborador-projeto' }));

    const unlocked = await conquistaEngine.verificarConquistas('user-1', DomainEventName.PROJETO_ACESSO_CONCEDIDO);
    expect(unlocked.some(c => c.slug === 'colaborador-projeto')).toBe(true);
  });

  it('deve desbloquear impacto viral quando conteúdo autoral atinge 100 likes', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([])) // conquista viral-likes ainda não desbloqueada
      .mockResolvedValueOnce(listResponse([{ id: 9, userId: 'user-viral' }])) // perfil do user
      .mockResolvedValueOnce(listResponse([{ id: 'proj-1', documentId: 'proj-doc-1' }])) // projetos autorais
      .mockResolvedValueOnce({
        data: [{ id: 'like-1' }],
        meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 100 } },
      })
      .mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 0 } },
      }) // likes do target
      .mockResolvedValueOnce(listResponse([{ id: 9, userId: 'user-viral' }])); // getPerfilId no unlock
    vi.mocked(strapiPost)
      .mockResolvedValueOnce(postResponse({ id: 'new-viral', slug: 'viral-likes' }))
      .mockResolvedValueOnce(postResponse({ id: 'junction-viral' }));

    const unlocked = await conquistaEngine.verificarConquistas('user-viral', DomainEventName.LIKE_ADICIONADO);

    expect(unlocked.some(c => c.slug === 'viral-likes')).toBe(true);
    expect(strapiGet).toHaveBeenCalledWith('/projetos', expect.objectContaining({
      'filters[autor][id][$eq]': '9',
    }));
    expect(strapiGet).toHaveBeenCalledWith('/likes', expect.objectContaining({
      'filters[targetType][$eq]': 'projeto',
      'filters[targetId][$eq]': 'proj-1',
    }));
  });

  it('não desbloqueia impacto viral quando nenhum conteúdo autoral atinge o limiar', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([])) // conquista viral-likes ainda não desbloqueada
      .mockResolvedValueOnce(listResponse([{ id: 9, userId: 'user-normal' }])) // perfil do user
      .mockResolvedValueOnce(listResponse([{ id: 'proj-1', documentId: 'proj-doc-1' }])) // projetos
      .mockResolvedValueOnce({
        data: [{ id: 'like-1' }],
        meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 99 } },
      })
      .mockResolvedValueOnce({
        data: [{ id: 'like-2' }],
        meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 99 } },
      })
      .mockResolvedValueOnce(listResponse([])); // feed-posts

    const unlocked = await conquistaEngine.verificarConquistas('user-normal', DomainEventName.LIKE_ADICIONADO);

    expect(unlocked.some(c => c.slug === 'viral-likes')).toBe(false);
    expect(strapiPost).not.toHaveBeenCalled();
  });

  it('usa fast-path referencia quando LIKE_ADICIONADO traz targetType:targetId', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([])) // conquista viral-likes ainda não desbloqueada
      .mockResolvedValueOnce(listResponse([{ id: 9, userId: 'user-viral' }])) // perfil do user
      .mockResolvedValueOnce(listResponse([{ id: 'proj-1', autor: { id: 9 }, documentId: 'proj-doc-1' }])) // verifyAuthorship /projetos/proj-1
      .mockResolvedValueOnce({
        data: [{ id: 'like-1' }],
        meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 100 } },
      })
      .mockResolvedValueOnce(listResponse([{ id: 9, userId: 'user-viral' }]));
    vi.mocked(strapiPost)
      .mockResolvedValueOnce(postResponse({ id: 'new-viral', slug: 'viral-likes' }))
      .mockResolvedValueOnce(postResponse({ id: 'junction-viral' }));

    const unlocked = await conquistaEngine.verificarConquistas('user-viral', DomainEventName.LIKE_ADICIONADO, 'projeto:proj-1');

    expect(unlocked.some(c => c.slug === 'viral-likes')).toBe(true);
    expect(strapiGet).not.toHaveBeenCalledWith('/projetos', expect.objectContaining({ 'pagination[page]': '1' }));
  });
});
