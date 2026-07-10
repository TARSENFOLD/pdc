import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from '../events/event-bus.js';
import { rankingHook } from './ranking.hook.js';
import { feedHook } from './feed.hook.js';
import { matchHook } from './match.hook.js';
import { achievementHook } from './achievement.hook.js';
import { notifyHook } from './notify.hook.js';
import { DomainEventName, EcosystemHookName, type EcosystemHookContext } from '@pdc/shared';
import type { StrapiListResponse, StrapiSingleResponse } from '@pdc/shared';
import { strapiPost, strapiPut, strapiGet } from '../strapi/strapi.client.js';

function listResponse<T>(data: Array<T & { id: string | number }>): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, total: data.length, pageCount: 1 } },
  };
}

function singleResponse<T>(data: T & { id: string | number }): StrapiSingleResponse<T> {
  return { data, meta: {} };
}

// Mocks controlados
vi.mock('../strapi/strapi.client.js', () => ({
  strapiPost: vi.fn(),
  strapiPut: vi.fn(),
  strapiGet: vi.fn(),
}));

vi.mock('../../lib/redis.js', () => ({
  redis: {
    sadd: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
  },
}));

// Mock da engine de conquistas para evitar chamadas complexas
vi.mock('../conquistas/conquistas.engine.js', () => ({
  conquistaEngine: {
    verificarConquistas: vi.fn().mockResolvedValue([{ slug: 'primeiro-curso', titulo: 'Primeiro Curso', descricao: 'Boa!' }]),
  }
}));

describe('G15: EcosystemHooks Integration', () => {
  const hookContext: EcosystemHookContext = {
    results: {
      [EcosystemHookName.RANKING]: { status: 'skipped' },
      [EcosystemHookName.FEED]: { status: 'skipped' },
      [EcosystemHookName.MATCH]: { status: 'skipped' },
      [EcosystemHookName.ACHIEVEMENT]: { status: 'skipped' },
      [EcosystemHookName.NOTIFY]: { status: 'skipped' },
      [EcosystemHookName.BEHAVIOR]: { status: 'skipped' },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.removeAllListeners();
    
    eventBus.registerHook(rankingHook);
    eventBus.registerHook(feedHook);
    eventBus.registerHook(matchHook);
    eventBus.registerHook(achievementHook);
    eventBus.registerHook(notifyHook);
    
    // Mock robusto de resposta de perfil (incluindo userId para achievement)
    vi.mocked(strapiGet).mockImplementation((path: string) => {
      if (path === '/match-suggestions') return Promise.resolve(listResponse([]));
      return Promise.resolve(listResponse([{
        id: 'autor-1', 
        role: 'mentor', 
        reputacao: 100, 
        areasInteresse: ['Tecnologia'],
        userId: 'user-123' 
      }]));
    });

    // Mock padrão de POST
    vi.mocked(strapiPost).mockResolvedValue(singleResponse({ id: 100 }));
    vi.mocked(strapiPut).mockResolvedValue(singleResponse({ id: 100 }));
  });

  it('deve executar o fluxo completo de 5 hooks ao publicar um curso', async () => {
    // Publicar evento
    await eventBus.publishWithOutbox(DomainEventName.CURSO_PUBLICADO, {
      cursoId: 'curso-99',
      autorId: 'autor-1',
      titulo: 'Curso de Integração',
      area: 'Tecnologia',
      regrasAcesso: {}
    });

    // 1. Validar Outbox (Agora é o primeiro call)
    expect(strapiPost).toHaveBeenNthCalledWith(1, '/domain-events', expect.any(Object));

    // 2. Validar Hook 2: Feed
    expect(strapiPost).toHaveBeenCalledWith('/feed-entries', expect.objectContaining({
      entityId: 'curso-99',
      source: 'vocacional'
    }));

    // 3. Validar Hook 3: Match
    expect(strapiPost).toHaveBeenCalledWith('/match-suggestions', expect.objectContaining({
      entityId: 'curso-99'
    }));

    // 4. Validar Hook 5: Notify (Notificação de conquista e auditoria via Strapi)
    expect(strapiPost).toHaveBeenCalledWith('/notificacoes', expect.objectContaining({
      tipo: 'conquista',
      titulo: 'Conquista Desbloqueada: Primeiro Curso',
      mensagem: 'Boa!',
      corpo: 'Boa!'
    }));

    expect(strapiPost).toHaveBeenCalledWith('/notificacoes', expect.objectContaining({
      tipo: 'sucesso',
      titulo: 'Actividade Processada',
      mensagem: 'O teu evento curso.publicado foi integrado no ecossistema.',
      corpo: 'O teu evento curso.publicado foi integrado no ecossistema.'
    }));

    // 5. Validar Finalização (Update do Outbox)
    expect(strapiPut).toHaveBeenCalledWith(expect.stringContaining('/domain-events/'), expect.objectContaining({
      processed: true
    }));
  });

  it('integra projeto publicado no feed com conteúdo e IDs normalizados', async () => {
    const result = await feedHook.execute({
      id: 'event-projeto-feed',
      name: DomainEventName.PROJETO_PUBLICADO,
      payload: {
        projetoId: 42,
        autorId: 9,
        titulo: 'Saúde comunitária',
        descricao: 'Projeto criado para apoiar comunidades em Angola.',
        area: 'SAUDE',
      },
      timestamp: '2026-06-14T12:00:00.000Z',
      correlationId: 'event-projeto-feed',
    }, hookContext);

    expect(result.status).toBe('sent');
    expect(strapiPost).toHaveBeenCalledWith('/feed-entries', expect.objectContaining({
      entityType: 'projeto',
      entityId: '42',
      autorId: '9',
      titulo: 'Saúde comunitária',
      corpo: 'Projeto criado para apoiar comunidades em Angola.',
    }));
  });

  it('resolve autor do projeto por ID relacional no Match do Strapi v5', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 9, reputacao: 60 }]))
      .mockResolvedValueOnce(listResponse([]));

    const result = await matchHook.execute({
      id: 'event-projeto-match',
      name: DomainEventName.PROJETO_PUBLICADO,
      payload: {
        projetoId: 'doc-projeto-42',
        autorId: '9',
        area: 'SAUDE',
      },
      timestamp: '2026-06-14T12:00:00.000Z',
      correlationId: 'event-projeto-match',
    }, hookContext);

    expect(result.status).toBe('sent');
    expect(strapiGet).toHaveBeenNthCalledWith(1, '/perfis', {
      'filters[id][$eq]': '9',
      'fields[0]': 'id',
      'fields[1]': 'reputacao',
      'pagination[pageSize]': '1',
    });
    expect(strapiGet).toHaveBeenNthCalledWith(2, '/perfis', {
      'filters[tipo][$eq]': 'estudante',
      'filters[areasInteresse][$containsi]': 'SAUDE',
      'pagination[page]': '1',
      'pagination[pageSize]': '100',
      'fields[0]': 'id',
      'fields[1]': 'reputacao',
      'fields[2]': 'areasInteresse',
    });
  });
});
