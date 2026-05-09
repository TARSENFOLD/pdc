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

vi.mock('pino', () => ({
  default: vi.fn(() => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() })),
}));

import { moderacaoService } from './moderacao.service.js';
import { strapiGet, strapiPut } from '../strapi/strapi.client.js';
import { eventBus } from '../events/event-bus.js';

function listResponse(data: Array<{ id: string | number; [k: string]: unknown }>) {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

describe('moderacaoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(eventBus.publishWithOutbox).mockResolvedValue({
      id: 'evt-uuid',
      name: DomainEventName.MODERADOR_APROVOU,
      payload: {},
      timestamp: new Date().toISOString(),
    });
  });

  describe('listarPendentes', () => {
    it('returns pending cursos in review state', async () => {
      vi.mocked(strapiGet).mockResolvedValue(
        listResponse([
          { id: '1', titulo: 'Curso de Programação', createdAt: new Date().toISOString() },
        ]),
      );

      const result = await moderacaoService.listarPendentes('curso');

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.titulo).toBe('Curso de Programação');
      expect(result.data[0]?.tipo).toBe('curso');
      expect(vi.mocked(strapiGet)).toHaveBeenCalledWith(
        '/cursos',
        expect.objectContaining({ 'filters[estado][$eq]': 'review' }),
      );
    });

    it('maps feed-post tipo to feed-posts collection', async () => {
      vi.mocked(strapiGet).mockResolvedValue(listResponse([]));

      await moderacaoService.listarPendentes('feed-post');

      expect(vi.mocked(strapiGet)).toHaveBeenCalledWith(
        '/feed-posts',
        expect.any(Object),
      );
    });

    it('returns empty data when no items in review', async () => {
      vi.mocked(strapiGet).mockResolvedValue(listResponse([]));

      const result = await moderacaoService.listarPendentes('simulacao');
      expect(result.data).toEqual([]);
    });
  });

  describe('aprovarConteudo', () => {
    it('approves content, sets estado approved, and emits MODERADOR_APROVOU', async () => {
      vi.mocked(strapiGet).mockResolvedValue(listResponse([{ id: '10', estado: 'review' }]));
      vi.mocked(strapiPut).mockResolvedValue({
        data: { id: '10' as string | number },
        meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
      });

      const result = await moderacaoService.aprovarConteudo('curso', '10', 'mod-1');

      expect(strapiPut).toHaveBeenCalledWith(
        '/cursos/10',
        expect.objectContaining({ estado: 'approved' }),
      );
      expect(eventBus.publishWithOutbox).toHaveBeenCalledWith(
        DomainEventName.MODERADOR_APROVOU,
        expect.objectContaining({ targetType: 'curso', targetId: '10', moderadorId: 'mod-1' }),
      );
      expect(result.eventId).toBe('evt-uuid');
    });

    it('approves programa content using programas collection', async () => {
      vi.mocked(strapiGet).mockResolvedValue(listResponse([{ id: '5', estado: 'review' }]));
      vi.mocked(strapiPut).mockResolvedValue({
        data: { id: '5' as string | number },
        meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
      });

      await moderacaoService.aprovarConteudo('programa', '5', 'mod-1');

      expect(strapiPut).toHaveBeenCalledWith('/programas/5', expect.objectContaining({ estado: 'approved' }));
    });

    it('throws 404 when content not found', async () => {
      vi.mocked(strapiGet).mockResolvedValue(listResponse([]));

      await expect(moderacaoService.aprovarConteudo('curso', '999', 'mod-1')).rejects.toMatchObject({
        status: 404,
      });
      expect(strapiPut).not.toHaveBeenCalled();
    });
  });

  describe('rejeitarConteudo', () => {
    it('rejects content with motivo, persists motivoRejeicao/rejeitadoEm/rejeitadoPor, and emits CONTEUDO_REJEITADO', async () => {
      vi.mocked(strapiGet).mockResolvedValue(listResponse([{ id: '7', estado: 'review' }]));
      vi.mocked(strapiPut).mockResolvedValue({
        data: { id: '7' as string | number },
        meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
      });
      vi.mocked(eventBus.publishWithOutbox).mockResolvedValue({
        id: 'evt-reject-uuid',
        name: DomainEventName.CONTEUDO_REJEITADO,
        payload: {},
        timestamp: new Date().toISOString(),
      });

      const motivo = 'Conteúdo não cumpre os requisitos mínimos de qualidade';
      const result = await moderacaoService.rejeitarConteudo('curso', '7', 'mod-1', motivo);

      expect(strapiPut).toHaveBeenCalledWith(
        '/cursos/7',
        expect.objectContaining({
          estado: 'draft',
          motivoRejeicao: motivo,
          rejeitadoPor: 'mod-1',
        }),
      );
      expect(vi.mocked(strapiPut).mock.calls[0]?.[1]).toMatchObject({
        rejeitadoEm: expect.any(String),
      });
      expect(eventBus.publishWithOutbox).toHaveBeenCalledWith(
        DomainEventName.CONTEUDO_REJEITADO,
        expect.objectContaining({ targetType: 'curso', targetId: '7', rejeitadorId: 'mod-1', motivo }),
      );
      expect(result.eventId).toBe('evt-reject-uuid');
    });

    it('rejects feed-post using feed-posts collection', async () => {
      vi.mocked(strapiGet).mockResolvedValue(listResponse([{ id: '3', estado: 'review' }]));
      vi.mocked(strapiPut).mockResolvedValue({
        data: { id: '3' as string | number },
        meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
      });

      await moderacaoService.rejeitarConteudo('feed-post', '3', 'mod-1', 'Conteúdo inadequado para a plataforma');

      expect(strapiPut).toHaveBeenCalledWith('/feed-posts/3', expect.any(Object));
    });

    it('throws ZodError for motivo shorter than 10 chars', async () => {
      await expect(
        moderacaoService.rejeitarConteudo('curso', '7', 'mod-1', 'curto'),
      ).rejects.toThrow();
      expect(strapiGet).not.toHaveBeenCalled();
      expect(strapiPut).not.toHaveBeenCalled();
    });

    it('throws 404 when content not found', async () => {
      vi.mocked(strapiGet).mockResolvedValue(listResponse([]));

      await expect(
        moderacaoService.rejeitarConteudo('simulacao', '999', 'mod-1', 'Conteúdo inválido e não aprovado'),
      ).rejects.toMatchObject({ status: 404 });
      expect(strapiPut).not.toHaveBeenCalled();
    });
  });
});
