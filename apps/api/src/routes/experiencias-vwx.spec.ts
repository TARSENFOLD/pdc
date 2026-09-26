import { app, payload, record, list, request, resetMocks } from './experiencias-vwx.test-support.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { strapiGet, strapiPut, strapiPost } from '../modules/strapi/strapi.client.js';
import { acquireLock } from '../lib/distributed-lock.js';
import {
  variantIssues,
  readinessIssues,
  experienceDto,
} from '../modules/experiencias/experience.service.js';
beforeEach(resetMocks);

describe('Separação dos tipos e privacidade VWX', () => {
  it('normaliza rascunhos antigos sem slug ou descrição, mas exige descrição para publicação', () => {
    const legacy = { ...record, slug: null, descricao: null };
    expect(experienceDto(legacy)).toMatchObject({ slug: 'doc-vwx', descricao: '' });
    expect(readinessIssues(legacy)).toContain('Preencher título e descrição.');
  });
  it('não escreve quando o lock editorial está ocupado', async () => {
    vi.mocked(strapiGet).mockResolvedValue(list([record]));
    vi.mocked(acquireLock).mockResolvedValueOnce(null);
    expect(
      (await request('/doc-vwx', { titulo: 'Nova versão' }, 'super_admin', 'PUT')).status
    ).toBe(409);
    expect(strapiPut).not.toHaveBeenCalled();
    expect(strapiPost).not.toHaveBeenCalled();
  });
  it.each([
    ['concluída', [{ id: 'p1', concluidoEm: '2026-09-26T12:00:00.000Z' }], 409],
    ['ausente', [], 403],
  ] as const)('progresso recusa participação %s', async (_name, participations, status) => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(list([record]))
      .mockResolvedValueOnce(list([record]))
      .mockResolvedValueOnce(list([...participations]));
    expect(
      (await request('/doc-vwx/progresso', { secoesConcluidas: [] }, 'estudante', 'PUT')).status
    ).toBe(status);
    expect(strapiPut).not.toHaveBeenCalled();
    expect(strapiPost).not.toHaveBeenCalled();
  });
  it('não duplica inscrição quando o lock está ocupado', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(list([record]))
      .mockResolvedValueOnce(list([record]))
      .mockResolvedValueOnce(list([]));
    vi.mocked(acquireLock).mockResolvedValueOnce(null);
    expect((await request('/doc-vwx/inscrever', {}, 'estudante')).status).toBe(409);
    expect(strapiPost).not.toHaveBeenCalled();
  });
  it('arquiva ambas as versões sem voltar a aprovar o conteúdo', async () => {
    vi.mocked(strapiGet).mockResolvedValue(list([{ ...record, estado: 'published' }]));
    expect(
      (await request('/doc-vwx/estado', { estado: 'archived' }, 'super_admin', 'PATCH')).status
    ).toBe(200);
    expect(strapiPut).toHaveBeenCalledWith(
      '/experiencias/doc-vwx',
      { estado: 'archived' },
      { status: 'draft' }
    );
    expect(strapiPut).toHaveBeenCalledWith(
      '/experiencias/doc-vwx',
      { estado: 'archived' },
      { status: 'published' }
    );
    expect(strapiPut).toHaveBeenCalledTimes(2);
    expect(strapiPost).not.toHaveBeenCalled();
  });
  it('relê o estado dentro do lock e não publica uma versão entretanto editada', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(list([record]))
      .mockResolvedValueOnce(list([{ ...record, estado: 'draft', vwxValidacao: null }]));
    expect(
      (await request('/doc-vwx/estado', { estado: 'published' }, 'super_admin', 'PATCH')).status
    ).toBe(409);
    expect(strapiPut).not.toHaveBeenCalled();
  });
  it('não autoriza uma instituição a publicar conteúdo de outro autor', async () => {
    vi.mocked(strapiGet).mockResolvedValue(list([record]));
    expect(
      (await request('/doc-vwx/estado', { estado: 'published' }, 'instituicao', 'PATCH')).status
    ).toBe(403);
    expect(strapiPut).not.toHaveBeenCalled();
  });
  it('autor não pode aprovar a própria revisão sem papel editorial', async () => {
    vi.mocked(strapiGet).mockResolvedValue(
      list([{ ...record, estado: 'review', autor: { userId: 'learner' } }])
    );
    expect(
      (await request('/doc-vwx/estado', { estado: 'approved' }, 'instituicao', 'PATCH')).status
    ).toBe(403);
    expect(strapiPut).not.toHaveBeenCalled();
  });
  it('validação de parceiro só aceita VWX completa', async () => {
    vi.mocked(strapiGet).mockResolvedValue(list([{ ...record, tipoExperiencia: 'institucional' }]));
    expect(
      (
        await request('/doc-vwx/validacao-parceiro', {
          responsavel: 'Parceiro',
          referencia: 'Evidência',
        })
      ).status
    ).toBe(404);
    vi.mocked(strapiGet).mockResolvedValue(list([{ ...record, secoes: [] }]));
    expect(
      (
        await request('/doc-vwx/validacao-parceiro', {
          responsavel: 'Parceiro',
          referencia: 'Evidência',
        })
      ).status
    ).toBe(422);
    expect(strapiPut).not.toHaveBeenCalled();
  });
  it('aceita percurso profissional completo', () => {
    expect(variantIssues(payload)).toEqual([]);
    expect(readinessIssues(record)).toEqual([]);
  });
  it('rejeita etapas profissionais numa Experiência institucional', () => {
    expect(variantIssues({ ...payload, tipoExperiencia: 'institucional' })).not.toEqual([]);
  });
  it('rejeita painéis institucionais numa VWX', () => {
    expect(variantIssues({ ...payload, painelRealidade: {} })).not.toEqual([]);
  });
  it('não considera secções vazias prontas para publicação', () => {
    expect(
      readinessIssues({ ...record, secoes: payload.secoes.map((s) => ({ ...s, itens: [] })) })
    ).toHaveLength(7);
  });
  it.each(['instituicao', 'mentor'])('%s não cria VWX', async (role) => {
    expect((await request('', payload, role)).status).toBe(403);
    expect(strapiPost).not.toHaveBeenCalled();
  });
  it('tipo fica imutável depois de criar', async () => {
    vi.mocked(strapiGet).mockResolvedValue(list([record]));
    expect(
      (await request('/doc-vwx', { tipoExperiencia: 'institucional' }, 'super_admin', 'PUT')).status
    ).toBe(409);
    expect(strapiPut).not.toHaveBeenCalled();
  });
  it('publicação exige validação do parceiro mesmo para admin', async () => {
    vi.mocked(strapiGet).mockResolvedValue(list([record]));
    expect(
      (await request('/doc-vwx/estado', { estado: 'published' }, 'super_admin', 'PATCH')).status
    ).toBe(422);
    expect(strapiPut).not.toHaveBeenCalled();
  });
  it('validação privada não é aceite no payload de edição', async () => {
    vi.mocked(strapiGet).mockResolvedValue(list([record]));
    await request(
      '/doc-vwx',
      { titulo: 'Título atualizado', vwxValidacao: { responsavel: 'forjado' } },
      'super_admin',
      'PUT'
    );
    expect(strapiPut).toHaveBeenCalledWith(
      '/experiencias/doc-vwx',
      {
        titulo: 'Título atualizado',
        estado: 'draft',
        vwxValidacao: null,
      },
      { status: 'draft' }
    );
  });
  it('publicação cria versão publicada e mantém documentId', async () => {
    vi.mocked(strapiGet).mockResolvedValue(
      list([{ ...record, vwxValidacao: { responsavel: 'Parceiro', referencia: 'Ata confirmada' } }])
    );
    expect(
      (await request('/doc-vwx/estado', { estado: 'published' }, 'super_admin', 'PATCH')).status
    ).toBe(200);
    expect(strapiPut).toHaveBeenCalledWith(
      '/experiencias/doc-vwx',
      { estado: 'approved' },
      { status: 'published' }
    );
    expect(strapiPut).toHaveBeenCalledWith(
      '/experiencias/doc-vwx',
      { estado: 'published' },
      { status: 'draft' }
    );
  });
  it('detalhe público omite evidência do parceiro, autor e secções privadas', async () => {
    vi.mocked(strapiGet).mockResolvedValue(
      list([
        {
          ...record,
          vwxValidacao: { responsavel: 'Nome privado', referencia: 'Documento interno' },
          secoes: payload.secoes.map((s) => ({ ...s, visibilidade: 'autenticado' })),
        },
      ])
    );
    const response = await app.request('/experiencias/vwx-produto');
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).not.toHaveProperty('autor');
    expect(body).not.toHaveProperty('vwxValidacao');
    expect(body).toMatchObject({ id: 'doc-vwx', secoes: [] });
  });
  it('consulta participação sempre usa o utilizador autenticado', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(list([record]))
      .mockResolvedValueOnce(list([record]))
      .mockResolvedValueOnce(list([]));
    const response = await app.request(
      '/experiencias/doc-vwx/participacao?estudanteId=outra-pessoa'
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ participacao: null });
    expect(strapiGet).toHaveBeenLastCalledWith(
      '/experiencia-participantes',
      expect.objectContaining({ 'filters[estudanteId][$eq]': 'learner' })
    );
  });
  it('lista pública também omite secções reservadas a participantes', async () => {
    vi.mocked(strapiGet).mockResolvedValue(
      list([
        { ...record, secoes: payload.secoes.map((s) => ({ ...s, visibilidade: 'autenticado' })) },
      ])
    );
    const response = await app.request('/experiencias');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: [{ id: 'doc-vwx', secoes: [] }] });
  });
  it('não permite saltar uma etapa canónica marcada como opcional', async () => {
    const optional = {
      ...record,
      secoes: payload.secoes.map((s) => ({ ...s, obrigatoria: false })),
    };
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(list([optional]))
      .mockResolvedValueOnce(list([optional]))
      .mockResolvedValueOnce(list([{ id: 'p1' }]));
    expect(
      (
        await request(
          '/doc-vwx/progresso',
          {
            secoesConcluidas: ['contexto'],
            entrega: 'Entregável',
            reflexao: 'Reflexão',
            concluir: true,
          },
          'estudante',
          'PUT'
        )
      ).status
    ).toBe(422);
    expect(strapiPut).not.toHaveBeenCalled();
  });
  it('recusa conclusão sem todas as etapas, entrega e reflexão', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(list([record]))
      .mockResolvedValueOnce(list([record]))
      .mockResolvedValueOnce(list([{ id: 'p1' }]));
    expect(
      (
        await request(
          '/doc-vwx/progresso',
          { secoesConcluidas: [], concluir: true },
          'estudante',
          'PUT'
        )
      ).status
    ).toBe(422);
    expect(strapiPut).not.toHaveBeenCalled();
  });
  it('recusa etapas de outra VWX', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(list([record]))
      .mockResolvedValueOnce(list([record]))
      .mockResolvedValueOnce(list([{ id: 'p1' }]));
    expect(
      (
        await request(
          '/doc-vwx/progresso',
          { secoesConcluidas: ['outra-etapa'] },
          'estudante',
          'PUT'
        )
      ).status
    ).toBe(422);
  });
  it('Experiência institucional não recebe entregáveis VWX', async () => {
    vi.mocked(strapiGet).mockResolvedValue(list([{ ...record, tipoExperiencia: 'institucional' }]));
    expect(
      (
        await request(
          '/doc-vwx/progresso',
          { secoesConcluidas: [], entrega: 'Texto' },
          'estudante',
          'PUT'
        )
      ).status
    ).toBe(422);
  });
});
