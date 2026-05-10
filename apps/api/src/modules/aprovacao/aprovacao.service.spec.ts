import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DomainEventName } from '@pdc/shared';

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPut: vi.fn(),
}));

vi.mock('../events/event-bus.js', () => ({
  eventBus: {
    publishWithOutbox: vi.fn(),
  },
}));

vi.mock('../../lib/redis.js', () => ({
  redis: {
    del: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('pino', () => ({
  default: vi.fn(() => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() })),
}));

import { aprovacaoService } from './aprovacao.service.js';
import { strapiGet, strapiPut } from '../strapi/strapi.client.js';
import { eventBus } from '../events/event-bus.js';
import { redis } from '../../lib/redis.js';

function perfilListResponse(data: Array<{ id: string | number; [k: string]: unknown }>) {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

const publishWithOutboxMock = vi.mocked(eventBus)['publishWithOutbox'];
const redisDelMock = vi.mocked(redis)['del'];

describe('aprovacaoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    publishWithOutboxMock.mockResolvedValue({
      id: 'evt-uuid',
      name: DomainEventName.PERFIL_APROVADO,
      payload: {},
      timestamp: new Date().toISOString(),
    });
    redisDelMock.mockResolvedValue(1);
  });

  describe('listarPendentes', () => {
    it('returns pending mentor profiles from Strapi', async () => {
      vi.mocked(strapiGet).mockResolvedValue(
        perfilListResponse([
          { id: '1', userId: '10', nome: 'João Silva', tipo: 'mentor', email: 'joao@test.com', createdAt: new Date().toISOString(), documentos: [{ tipo: 'CV', url: 'https://r2.example.com/cv.pdf' }], areaFormacao: 'Engenharia' },
        ]),
      );

      const result = await aprovacaoService.listarPendentes('mentor');

      expect(result).toHaveLength(1);
      expect(result[0]?.nome).toBe('João Silva');
      expect(result[0]?.tipo).toBe('mentor');
      expect(result[0]?.areaFormacao).toBe('Engenharia');
      expect(vi.mocked(strapiGet)).toHaveBeenCalledWith(
        '/perfis',
        expect.objectContaining({ 'filters[tipo][$eq]': 'mentor', 'filters[aprovado][$eq]': 'false' }),
      );
    });

    it('returns empty array when no pending profiles', async () => {
      vi.mocked(strapiGet).mockResolvedValue(perfilListResponse([]));
      const result = await aprovacaoService.listarPendentes('instituicao');
      expect(result).toEqual([]);
    });
  });

  describe('aprovarPerfil', () => {
    it('approves perfil, invalidates cache, and emits PERFIL_APROVADO event', async () => {
      vi.mocked(strapiGet).mockResolvedValue(
        perfilListResponse([{ id: '5', userId: '20', tipo: 'mentor' }]),
      );
      vi.mocked(strapiPut).mockResolvedValue({ data: { id: '5' as string | number }, meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } } });

      const result = await aprovacaoService.aprovarPerfil('5', 'admin-1');

      expect(strapiPut).toHaveBeenCalledWith(
        '/perfis/5',
        expect.objectContaining({ aprovado: true, aprovadoPor: 'admin-1' }),
      );
      expect(redisDelMock).toHaveBeenCalledWith('requireApproved:20');
      expect(publishWithOutboxMock).toHaveBeenCalledWith(
        DomainEventName.PERFIL_APROVADO,
        expect.objectContaining({ perfilId: '5', aprovadorId: 'admin-1', userId: '20' }),
      );
      expect(result.eventId).toBe('evt-uuid');
    });

    it('throws 404 when perfil not found', async () => {
      vi.mocked(strapiGet).mockResolvedValue(perfilListResponse([]));

      await expect(aprovacaoService.aprovarPerfil('999', 'admin-1')).rejects.toMatchObject({
        status: 404,
      });
      expect(strapiPut).not.toHaveBeenCalled();
    });
  });

  describe('rejeitarPerfil', () => {
    it('rejects perfil with motivo, invalidates cache, and emits PERFIL_REJEITADO event', async () => {
      vi.mocked(strapiGet).mockResolvedValue(
        perfilListResponse([{ id: '7', userId: '30', tipo: 'mentor' }]),
      );
      vi.mocked(strapiPut).mockResolvedValue({ data: { id: '7' as string | number }, meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } } });
      publishWithOutboxMock.mockResolvedValue({
        id: 'evt-reject-uuid',
        name: DomainEventName.PERFIL_REJEITADO,
        payload: {},
        timestamp: new Date().toISOString(),
      });

      const result = await aprovacaoService.rejeitarPerfil('7', 'admin-1', 'Documentos inválidos e ilegíveis');

      expect(strapiPut).toHaveBeenCalledWith(
        '/perfis/7',
        expect.objectContaining({ aprovado: false, motivoRejeicao: 'Documentos inválidos e ilegíveis' }),
      );
      expect(redisDelMock).toHaveBeenCalledWith('requireApproved:30');
      expect(publishWithOutboxMock).toHaveBeenCalledWith(
        DomainEventName.PERFIL_REJEITADO,
        expect.objectContaining({ perfilId: '7', rejeitadorId: 'admin-1', motivo: 'Documentos inválidos e ilegíveis' }),
      );
      expect(result.eventId).toBe('evt-reject-uuid');
    });

    it('throws ZodError for motivo shorter than 10 chars', async () => {
      await expect(aprovacaoService.rejeitarPerfil('7', 'admin-1', 'curto')).rejects.toThrow();
      expect(strapiGet).not.toHaveBeenCalled();
    });

    it('throws 404 when perfil not found', async () => {
      vi.mocked(strapiGet).mockResolvedValue(perfilListResponse([]));

      await expect(
        aprovacaoService.rejeitarPerfil('999', 'admin-1', 'Documentos em falta e ilegíveis'),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
