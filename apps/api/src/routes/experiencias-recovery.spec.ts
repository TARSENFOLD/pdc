import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import {
  app,
  list,
  record,
  request,
  resetMocks,
  publishWithOutboxMock,
} from './experiencias-vwx.test-support.js';
import {
  strapiGet,
  strapiPost,
  strapiPut,
  StrapiHttpError,
} from '../modules/strapi/strapi.client.js';
import { acquireLock } from '../lib/distributed-lock.js';
import { ensureParticipationEvent } from '../modules/experiencias/experience-recovery.js';

beforeEach(() => {
  resetMocks();
  publishWithOutboxMock.mockClear();
});

describe('Experiências — recuperação e erros semânticos', () => {
  it('guarda a indicação editorial de correção sem a tornar pública', async () => {
    vi.mocked(strapiGet).mockResolvedValue(list([{ ...record, estado: 'review' }]));
    const motivo = 'Acrescenta exemplos concretos às etapas.';
    expect(
      (await request('/doc-vwx/estado', { estado: 'rejected', motivo }, 'super_admin', 'PATCH'))
        .status
    ).toBe(200);
    expect(strapiPut).toHaveBeenCalledWith(
      '/experiencias/doc-vwx',
      { estado: 'rejected', motivoRejeicao: motivo },
      { status: 'draft' }
    );
    vi.mocked(strapiGet).mockResolvedValue(list([{ ...record, motivoRejeicao: motivo }]));
    const response = await app.request('/experiencias');
    expect(JSON.stringify(await response.json())).not.toContain(motivo);
  });
  it('não transforma escrita concluída em erro quando falha a libertação do lock', async () => {
    vi.mocked(strapiGet).mockResolvedValue(list([record]));
    vi.mocked(acquireLock).mockResolvedValueOnce({
      key: 'test',
      fencingToken: 1,
      extend: vi.fn(),
      release: vi.fn().mockRejectedValue(new Error('Redis indisponível')),
    });
    expect((await request('/doc-vwx', { titulo: 'Atualizado' }, 'super_admin', 'PUT')).status).toBe(
      200
    );
    expect(strapiPut).toHaveBeenCalledTimes(1);
  });

  it('permite arquivar publicação existente mesmo com novo rascunho incompleto', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(list([{ ...record, estado: 'draft' }]))
      .mockResolvedValueOnce(list([{ ...record, estado: 'draft', secoes: [] }]))
      .mockResolvedValueOnce(list([record]));
    expect(
      (await request('/doc-vwx/estado', { estado: 'archived' }, 'super_admin', 'PATCH')).status
    ).toBe(200);
    expect(strapiPut).toHaveBeenCalledTimes(2);
  });

  it('não permite arquivar um rascunho nunca publicado', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(list([{ ...record, estado: 'draft' }]))
      .mockResolvedValueOnce(list([{ ...record, estado: 'draft' }]))
      .mockResolvedValueOnce(list([]));
    expect(
      (await request('/doc-vwx/estado', { estado: 'archived' }, 'super_admin', 'PATCH')).status
    ).toBe(409);
    expect(strapiPut).not.toHaveBeenCalled();
  });

  it('preserva o estado de HTTPException', async () => {
    vi.mocked(strapiGet).mockRejectedValueOnce(
      new HTTPException(401, { message: 'Sessão expirada' })
    );
    expect((await app.request('/experiencias')).status).toBe(401);
  });

  it('mostra a razão da validação Strapi, sem a confundir com indisponibilidade', async () => {
    vi.mocked(strapiGet).mockRejectedValueOnce(
      new StrapiHttpError('Validation', 400, '/experiencias', {
        error: { message: 'Experiência bloqueada: debrief' },
      })
    );
    const response = await app.request('/experiencias');
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Experiência bloqueada: debrief' });
  });

  it('não oculta dados corrompidos nem os apresenta como serviço indisponível', async () => {
    vi.mocked(strapiGet).mockResolvedValue(list([{ ...record, titulo: null }]));
    const response = await app.request('/experiencias');
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: 'CONTENT_INVALID' });
  });

  it('pagina a gestão preservando o filtro do autor', async () => {
    vi.mocked(strapiGet).mockResolvedValue(list([]));
    expect(
      (
        await app.request('/experiencias/minhas?page=3&pageSize=12', {
          headers: { 'x-role': 'mentor' },
        })
      ).status
    ).toBe(200);
    expect(strapiGet).toHaveBeenCalledWith(
      '/experiencias',
      expect.objectContaining({
        'pagination[page]': '3',
        'pagination[pageSize]': '12',
        'filters[autor][userId][$eq]': 'learner',
        status: 'draft',
      })
    );
  });

  it('repara inscrição persistida sem evento, sem criar outra participação', async () => {
    vi.mocked(strapiGet).mockImplementation((path) =>
      Promise.resolve(
        path === '/experiencias'
          ? list([record])
          : path === '/experiencia-participantes'
            ? list([{ id: 'p1' }])
            : list([])
      )
    );
    expect((await request('/doc-vwx/inscrever', {}, 'estudante')).status).toBe(200);
    expect(strapiPost).not.toHaveBeenCalled();
    expect(publishWithOutboxMock).toHaveBeenCalledWith(
      'experiencia.participacao',
      { experienciaId: 'doc-vwx', estudanteId: 'learner' },
      expect.stringMatching(/^[a-f0-9-]{36}$/)
    );
  });

  it('recupera conclusão após resposta perdida, sem alterar o trabalho entregue', async () => {
    const completed = {
      id: 'p1',
      secoesConcluidas: ['contexto'],
      entrega: 'Trabalho',
      reflexao: 'Reflexão',
      concluidoEm: '2026-10-01T12:00:00.000Z',
    };
    vi.mocked(strapiGet).mockImplementation((path) =>
      Promise.resolve(
        path === '/experiencias'
          ? list([record])
          : path === '/experiencia-participantes'
            ? list([completed])
            : list([])
      )
    );
    const response = await request(
      '/doc-vwx/progresso',
      { ...completed, concluir: true },
      'estudante',
      'PUT'
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(completed);
    expect(strapiPut).not.toHaveBeenCalled();
    expect(publishWithOutboxMock).toHaveBeenCalledWith(
      'experiencia.progresso',
      { experienciaId: 'doc-vwx', estudanteId: 'learner', concluido: true },
      expect.any(String)
    );
  });

  it('não volta a emitir evento que já está durável no outbox', async () => {
    vi.mocked(strapiGet).mockResolvedValue(list([{ id: 'event' }]));
    await ensureParticipationEvent('exp', 'user', 'part', true);
    expect(publishWithOutboxMock).not.toHaveBeenCalled();
  });

  it('tolera resposta perdida depois da persistência do evento', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(list([]))
      .mockResolvedValueOnce(list([{ id: 'event' }]));
    publishWithOutboxMock.mockRejectedValueOnce(new Error('Resposta perdida'));
    await expect(ensureParticipationEvent('exp', 'user', 'part', true)).resolves.toBeUndefined();
  });

  it('uma falha antes do outbox permanece explícita e o retry usa a mesma identidade', async () => {
    vi.mocked(strapiGet).mockResolvedValue(list([]));
    publishWithOutboxMock.mockRejectedValueOnce(new Error('Falha de escrita'));
    await expect(ensureParticipationEvent('exp', 'user', 'part', true)).rejects.toThrow(
      'Falha de escrita'
    );
    await ensureParticipationEvent('exp', 'user', 'part', true);
    const calls = publishWithOutboxMock.mock.calls;
    expect(calls[0]?.[2]).toBe(calls[1]?.[2]);
  });
});
