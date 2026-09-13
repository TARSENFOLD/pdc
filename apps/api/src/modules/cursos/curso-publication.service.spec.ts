import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Curso } from '@pdc/shared';
import { DomainEventName } from '../events/types.js';

const strapiMock = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
}));
const publishWithOutboxMock = vi.hoisted(() => vi.fn());
const transitionLockMock = vi.hoisted(() => ({
  acquire: vi.fn(),
  extend: vi.fn(),
  release: vi.fn(),
}));

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: strapiMock.get,
  strapiPut: strapiMock.put,
  strapiPost: vi.fn(),
  strapiDelete: vi.fn(),
}));
vi.mock('../events/event-bus.js', () => ({
  eventBus: { publishWithOutbox: publishWithOutboxMock },
}));
vi.mock('../../lib/distributed-lock.js', () => ({
  acquireLock: transitionLockMock.acquire,
}));

import { cursosService } from './cursos.service.js';

const approvedCourse: Curso = {
  id: 'curso-1',
  slug: 'curso-1',
  titulo: 'Curso completo',
  descricao: 'Descrição completa para publicação.',
  autorId: 'mentor-1',
  totalHoras: 1,
  estado: 'approved',
  rating: 0,
  inscritosCount: 0,
  createdAt: '2026-09-07T12:00:00.000Z',
  updatedAt: '2026-09-07T12:00:00.000Z',
};

describe('course dual-state publication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transitionLockMock.extend.mockResolvedValue(true);
    transitionLockMock.release.mockResolvedValue(true);
    transitionLockMock.acquire.mockResolvedValue({
      key: 'curso:transition:curso-1',
      fencingToken: 1,
      extend: transitionLockMock.extend,
      release: transitionLockMock.release,
    });
    strapiMock.get.mockResolvedValue({
      data: [{ ...approvedCourse, documentId: 'doc-curso-1' }],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
    });
  });

  it('emite o evento apenas depois do draft e snapshot terem sido escritos', async () => {
    strapiMock.put.mockResolvedValue({ data: approvedCourse });

    await expect(
      cursosService.alterarEstado('curso-1', 'published', 'mentor-1', approvedCourse)
    ).resolves.toBeUndefined();

    expect(strapiMock.put.mock.calls).toEqual([
      ['/cursos/doc-curso-1', { estado: 'published' }, { status: 'draft' }],
      ['/cursos/doc-curso-1', { estado: 'approved' }, { status: 'published' }],
    ]);
    expect(publishWithOutboxMock).toHaveBeenCalledOnce();
    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.CURSO_PUBLICADO, {
      cursoId: 'curso-1',
      autorId: 'mentor-1',
      titulo: 'Curso completo',
      area: undefined,
      regrasAcesso: undefined,
    });
    expect(publishWithOutboxMock.mock.invocationCallOrder[0]).toBeGreaterThan(
      strapiMock.put.mock.invocationCallOrder[1] ?? 0
    );
    expect(transitionLockMock.extend).toHaveBeenCalledTimes(2);
  });

  it('não publica nem emite evento quando a primeira escrita falha', async () => {
    strapiMock.put.mockRejectedValueOnce(new Error('draft indisponível'));

    await expect(
      cursosService.alterarEstado('curso-1', 'published', 'mentor-1', approvedCourse)
    ).rejects.toThrow('draft indisponível');

    expect(strapiMock.put).toHaveBeenCalledOnce();
    expect(publishWithOutboxMock).not.toHaveBeenCalled();
  });

  it('recusa uma segunda transição enquanto o curso está bloqueado', async () => {
    transitionLockMock.acquire.mockResolvedValueOnce(null);

    await expect(
      cursosService.alterarEstado('curso-1', 'published', 'mentor-1', approvedCourse)
    ).rejects.toMatchObject({ status: 409, retryable: true });

    expect(strapiMock.get).not.toHaveBeenCalled();
    expect(strapiMock.put).not.toHaveBeenCalled();
  });

  it('recusa publicar quando o draft atual já não existe', async () => {
    strapiMock.get.mockResolvedValueOnce({
      data: [],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 0, total: 0 } },
    });

    await expect(cursosService.alterarEstado('curso-1', 'published', 'mentor-1')).rejects.toThrow(
      'Curso não encontrado'
    );

    expect(strapiMock.put).not.toHaveBeenCalled();
    expect(publishWithOutboxMock).not.toHaveBeenCalled();
  });

  it('compensa com o estado lido agora, mesmo quando o snapshot do chamador está obsoleto', async () => {
    strapiMock.get.mockResolvedValueOnce({
      data: [{ id: 'curso-1', documentId: 'doc-curso-1', estado: 'review' }],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
    });
    strapiMock.put
      .mockResolvedValueOnce({ data: approvedCourse })
      .mockRejectedValueOnce(new Error('snapshot indisponível'))
      .mockResolvedValueOnce({ data: approvedCourse });

    await expect(
      cursosService.alterarEstado('curso-1', 'published', 'mentor-1', approvedCourse)
    ).rejects.toThrow('snapshot indisponível');

    expect(strapiMock.put.mock.calls[2]).toEqual([
      '/cursos/doc-curso-1',
      { estado: 'review' },
      { status: 'draft' },
    ]);
  });

  it('repõe o estado anterior quando o snapshot publicado falha', async () => {
    strapiMock.put
      .mockResolvedValueOnce({ data: approvedCourse })
      .mockRejectedValueOnce(new Error('snapshot indisponível'))
      .mockResolvedValueOnce({ data: approvedCourse });

    await expect(
      cursosService.alterarEstado('curso-1', 'published', 'mentor-1', approvedCourse)
    ).rejects.toThrow('snapshot indisponível');

    expect(strapiMock.put.mock.calls[2]).toEqual([
      '/cursos/doc-curso-1',
      { estado: 'approved' },
      { status: 'draft' },
    ]);
    expect(publishWithOutboxMock).not.toHaveBeenCalled();
  });

  it('expõe a necessidade de reconciliação se a compensação também falhar', async () => {
    strapiMock.put
      .mockResolvedValueOnce({ data: approvedCourse })
      .mockRejectedValueOnce(new Error('snapshot indisponível'))
      .mockRejectedValueOnce(new Error('compensação indisponível'));

    await expect(
      cursosService.alterarEstado('curso-1', 'published', 'mentor-1', approvedCourse)
    ).rejects.toThrow('precisa de reconciliação');
    expect(publishWithOutboxMock).not.toHaveBeenCalled();
  });

  it('não restaura estado obsoleto quando perde o lease antes da compensação', async () => {
    transitionLockMock.extend
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    strapiMock.put
      .mockResolvedValueOnce({ data: approvedCourse })
      .mockRejectedValueOnce(new Error('snapshot indisponível'));

    await expect(
      cursosService.alterarEstado('curso-1', 'published', 'mentor-1', approvedCourse)
    ).rejects.toThrow('precisa de reconciliação');

    expect(strapiMock.put).toHaveBeenCalledTimes(2);
    expect(publishWithOutboxMock).not.toHaveBeenCalled();
    expect(transitionLockMock.release).toHaveBeenCalledOnce();
  });

  it('arquiva o draft e o snapshot publicado antes de emitir o evento', async () => {
    strapiMock.put.mockResolvedValue({ data: { ...approvedCourse, estado: 'archived' } });

    await expect(
      cursosService.alterarEstado('curso-1', 'archived', 'mentor-1', approvedCourse)
    ).resolves.toBeUndefined();

    expect(strapiMock.put.mock.calls).toEqual([
      ['/cursos/doc-curso-1', { estado: 'archived' }, { status: 'draft' }],
      ['/cursos/doc-curso-1', { estado: 'archived' }, { status: 'published' }],
    ]);
    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.CURSO_ARQUIVADO, {
      cursoId: 'curso-1',
      autorId: 'mentor-1',
    });
    expect(publishWithOutboxMock.mock.invocationCallOrder[0]).toBeGreaterThan(
      strapiMock.put.mock.invocationCallOrder[1] ?? 0
    );
  });

  it('repõe o estado anterior quando o arquivamento do snapshot falha', async () => {
    strapiMock.put
      .mockResolvedValueOnce({ data: { ...approvedCourse, estado: 'archived' } })
      .mockRejectedValueOnce(new Error('snapshot indisponível'))
      .mockResolvedValueOnce({ data: approvedCourse });

    await expect(
      cursosService.alterarEstado('curso-1', 'archived', 'mentor-1', approvedCourse)
    ).rejects.toThrow('snapshot indisponível');

    expect(strapiMock.put.mock.calls[2]).toEqual([
      '/cursos/doc-curso-1',
      { estado: 'approved' },
      { status: 'draft' },
    ]);
    expect(publishWithOutboxMock).not.toHaveBeenCalled();
  });

  it('expõe reconciliação quando a compensação do arquivamento também falha', async () => {
    strapiMock.put
      .mockResolvedValueOnce({ data: { ...approvedCourse, estado: 'archived' } })
      .mockRejectedValueOnce(new Error('snapshot indisponível'))
      .mockRejectedValueOnce(new Error('compensação indisponível'));

    await expect(
      cursosService.alterarEstado('curso-1', 'archived', 'mentor-1', approvedCourse)
    ).rejects.toThrow('precisa de reconciliação');
    expect(publishWithOutboxMock).not.toHaveBeenCalled();
  });
});
