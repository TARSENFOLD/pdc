import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from '../events/event-bus.js';
import { rankingHook } from './ranking.hook.js';
import { feedHook } from './feed.hook.js';
import { matchHook } from './match.hook.js';
import { achievementHook } from './achievement.hook.js';
import { notifyHook } from './notify.hook.js';
import { DomainEventName } from '@pdc/shared';
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
  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.removeAllListeners();
    
    eventBus.registerHook(rankingHook);
    eventBus.registerHook(feedHook);
    eventBus.registerHook(matchHook);
    eventBus.registerHook(achievementHook);
    eventBus.registerHook(notifyHook);
    
    // Mock robusto de resposta de perfil (incluindo userId para achievement)
    vi.mocked(strapiGet).mockResolvedValue(listResponse([{
        id: 'autor-1', 
        role: 'mentor', 
        reputacao: 100, 
        areaInteresse: 'Tecnologia',
        userId: 'user-123' 
      }]));

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
});
