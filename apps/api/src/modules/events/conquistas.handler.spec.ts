import { describe, expect, it, vi, beforeEach } from 'vitest';
import { conquistasHandler } from './conquistas.handler.js';
import { conquistaEngine } from '../conquistas/conquistas.engine.js';
import { DomainEventName } from './types.js';
import { strapiGet } from '../strapi/strapi.client.js';
import type { StrapiListResponse } from '../strapi/strapi.types.js';

// Mocks
vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
}));

vi.mock('../conquistas/conquistas.engine.js', () => ({
  conquistaEngine: {
    verificarConquistas: vi.fn(),
  },
}));

describe('Conquistas Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const event = {
    id: 'evt-conq',
    name: DomainEventName.TENTATIVA_CONCLUIDA,
    payload: { tentativaId: 'tent-123', perfilId: 'perf-789' },
    timestamp: new Date().toISOString(),
  };

  it('deve resolver userId e chamar verificarConquistas com o tipo de evento correto (Happy Path)', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce({ 
      data: [{ id: 'perf-789', userId: 'user-001', documentId: 'doc-1', createdAt: '', updatedAt: '' }],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } }
    } as StrapiListResponse<unknown>);
    
    vi.mocked(conquistaEngine.verificarConquistas).mockResolvedValueOnce([]);

    await conquistasHandler(event);

    expect(strapiGet).toHaveBeenCalled();
    expect(conquistaEngine.verificarConquistas).toHaveBeenCalledWith(
      'user-001',
      DomainEventName.TENTATIVA_CONCLUIDA,
      'tent-123'
    );
  });

  it('deve mapear outros tipos de eventos corretamente', async () => {
    const cursoEvent = {
      ...event,
      name: DomainEventName.CURSO_CONCLUIDO,
    };

    vi.mocked(strapiGet).mockResolvedValueOnce({ 
      data: [{ id: 'perf-789', userId: 'user-001', documentId: 'doc-1', createdAt: '', updatedAt: '' }],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } }
    } as StrapiListResponse<unknown>);

    await conquistasHandler(cursoEvent);

    expect(conquistaEngine.verificarConquistas).toHaveBeenCalledWith(
      'user-001',
      DomainEventName.CURSO_CONCLUIDO,
      'tent-123'
    );
  });

  it('deve propagar erro se a engine de conquistas falhar', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce({ 
      data: [{ id: 'perf-789', userId: 'user-001', documentId: 'doc-1', createdAt: '', updatedAt: '' }],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } }
    } as StrapiListResponse<unknown>);

    vi.mocked(conquistaEngine.verificarConquistas).mockRejectedValueOnce(new Error('Engine Error'));

    await expect(conquistasHandler(event)).rejects.toThrow('Engine Error');
  });

  it('deve falhar se o perfilId não puder ser resolvido para userId', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce({ 
      data: [],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 0, total: 0 } }
    } as StrapiListResponse<unknown>);

    await expect(conquistasHandler(event)).rejects.toThrow(/UserId não encontrado/);
  });
});
