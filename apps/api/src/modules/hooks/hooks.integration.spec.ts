import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from '../events/event-bus.js';
import { DomainEventName } from '@pdc/shared';
import { strapiPost, strapiPut, strapiGet } from '../strapi/strapi.client.js';

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
    
    // Mock robusto de resposta de perfil (incluindo userId para achievement)
    vi.mocked(strapiGet).mockResolvedValue({ 
      data: [{ 
        id: 'autor-1', 
        role: 'mentor', 
        reputacao: 100, 
        areaInteresse: 'Tecnologia',
        userId: 'user-123' 
      }],
      meta: { pagination: { page: 1, pageSize: 10, total: 1, pageCount: 1 } }
    } as any);

    // Mock padrão de POST
    vi.mocked(strapiPost).mockResolvedValue({ data: { id: 100 }, meta: {} } as any);
    vi.mocked(strapiPut).mockResolvedValue({ data: { id: 100 }, meta: {} } as any);
  });

  it('deve executar o fluxo completo de 5 hooks ao publicar um curso', async () => {
    // Publicar evento
    await eventBus.publishWithOutbox(DomainEventName.CURSO_PUBLICADO, {
      cursoId: 'curso-99',
      autorId: 'autor-1',
      titulo: 'Curso de Integração',
      area: 'Tecnologia'
    });

    // 1. Validar Outbox
    expect(strapiPost).toHaveBeenCalledWith('/domain-events', expect.any(Object));

    // 2. Validar Hook 2: Feed
    expect(strapiPost).toHaveBeenCalledWith('/feed-entries', expect.objectContaining({
      entityId: 'curso-99',
      source: 'geral'
    }));

    // 3. Validar Hook 3: Match
    expect(strapiPost).toHaveBeenCalledWith('/match-suggestions', expect.objectContaining({
      entityId: 'curso-99'
    }));

    // 4. Validar Hook 5: Notify (Side-effect de conquista + Notificação de sucesso)
    // Devem haver chamadas para /notificacoes
    expect(strapiPost).toHaveBeenCalledWith('/notificacoes', expect.objectContaining({
      tipo: 'conquista'
    }));
    
    expect(strapiPost).toHaveBeenCalledWith('/notificacoes', expect.objectContaining({
      tipo: 'sucesso'
    }));

    // 5. Validar Finalização
    expect(strapiPut).toHaveBeenCalledWith(expect.stringContaining('/domain-events/'), expect.objectContaining({
      processed: true
    }));
  });
});
