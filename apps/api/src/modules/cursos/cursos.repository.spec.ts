import { beforeEach, describe, expect, it, vi } from 'vitest';

const strapiMock = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: strapiMock.get,
  strapiPost: vi.fn(),
  strapiPut: vi.fn(),
  strapiDelete: vi.fn(),
}));

import { listarModulosCurso } from './cursos.repository.js';

function response<T>(
  data: T[],
  pagination: { page: number; pageSize: number; pageCount: number; total: number } = {
    page: 1,
    pageSize: data.length,
    pageCount: 1,
    total: data.length,
  }
) {
  return {
    data,
    meta: { pagination },
  };
}

describe('cursos repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carrega os itens de vários módulos numa única consulta e preserva a relação', async () => {
    strapiMock.get
      .mockResolvedValueOnce(
        response([
          { id: 10, documentId: 'modulo-a', titulo: 'Módulo A', ordem: 1 },
          { id: 20, documentId: 'modulo-b', titulo: 'Módulo B', ordem: 2 },
        ])
      )
      .mockResolvedValueOnce(
        response([
          {
            id: 200,
            documentId: 'item-b',
            titulo: 'Aula B',
            tipo: 'texto',
            ordem: 1,
            modulo: { id: 20, documentId: 'modulo-b' },
          },
          {
            id: 100,
            documentId: 'item-a',
            titulo: 'Aula A',
            tipo: 'texto',
            ordem: 1,
            modulo: { id: 10, documentId: 'modulo-a' },
          },
        ])
      );

    const modules = await listarModulosCurso('curso-1', 'curso-document-id');

    expect(modules.map((module) => module.itens.map((item) => item.documentId))).toEqual([
      ['item-a'],
      ['item-b'],
    ]);
    expect(strapiMock.get).toHaveBeenCalledTimes(2);
    expect(strapiMock.get).toHaveBeenNthCalledWith(
      2,
      '/modulo-items',
      expect.objectContaining({
        'filters[$or][0][modulo][documentId][$in]': ['modulo-a', 'modulo-b'],
        'filters[$or][1][modulo][id][$in]': ['10', '20'],
        populate: 'modulo',
      })
    );
  });

  it('carrega todas as páginas de módulos antes de consultar os itens', async () => {
    strapiMock.get
      .mockResolvedValueOnce(
        response([{ id: 10, documentId: 'modulo-a', titulo: 'Módulo A', ordem: 1 }], {
          page: 1,
          pageSize: 1,
          pageCount: 2,
          total: 2,
        })
      )
      .mockResolvedValueOnce(
        response([{ id: 20, documentId: 'modulo-b', titulo: 'Módulo B', ordem: 2 }], {
          page: 2,
          pageSize: 1,
          pageCount: 2,
          total: 2,
        })
      )
      .mockResolvedValueOnce(response([]));

    const modules = await listarModulosCurso('curso-1', 'curso-document-id');

    expect(modules.map((module) => module.documentId)).toEqual(['modulo-a', 'modulo-b']);
    expect(strapiMock.get).toHaveBeenNthCalledWith(
      2,
      '/modulos',
      expect.objectContaining({ 'pagination[page]': '2' })
    );
    expect(strapiMock.get).toHaveBeenNthCalledWith(
      3,
      '/modulo-items',
      expect.objectContaining({
        'filters[$or][0][modulo][documentId][$in]': ['modulo-a', 'modulo-b'],
      })
    );
  });

  it('associa um item sem relação quando o curso tem um único módulo', async () => {
    strapiMock.get
      .mockResolvedValueOnce(
        response([{ id: 10, documentId: 'modulo-a', titulo: 'Módulo A', ordem: 1 }])
      )
      .mockResolvedValueOnce(
        response([{ id: 100, documentId: 'item-a', titulo: 'Aula A', tipo: 'texto', ordem: 1 }])
      );

    await expect(listarModulosCurso('curso-1', 'curso-document-id')).resolves.toMatchObject([
      { documentId: 'modulo-a', itens: [{ documentId: 'item-a' }] },
    ]);
  });

  it('usa o id numérico da relação quando o documentId relacionado está desatualizado', async () => {
    strapiMock.get
      .mockResolvedValueOnce(
        response([
          { id: 10, documentId: 'modulo-a', titulo: 'Módulo A', ordem: 1 },
          { id: 20, documentId: 'modulo-b', titulo: 'Módulo B', ordem: 2 },
        ])
      )
      .mockResolvedValueOnce(
        response([
          {
            id: 100,
            documentId: 'item-a',
            titulo: 'Aula A',
            tipo: 'texto',
            ordem: 1,
            modulo: { id: 10, documentId: 'document-id-antigo' },
          },
        ])
      );

    const modules = await listarModulosCurso('curso-1', 'curso-document-id');

    expect(modules[0]?.itens).toEqual([expect.objectContaining({ documentId: 'item-a' })]);
    expect(modules[1]?.itens).toEqual([]);
  });

  it('rejeita um item cuja relação não pertence aos módulos pedidos', async () => {
    strapiMock.get
      .mockResolvedValueOnce(
        response([
          { id: 10, documentId: 'modulo-a', titulo: 'Módulo A', ordem: 1 },
          { id: 20, documentId: 'modulo-b', titulo: 'Módulo B', ordem: 2 },
        ])
      )
      .mockResolvedValueOnce(
        response([
          {
            id: 999,
            documentId: 'item-externo',
            titulo: 'Aula externa',
            tipo: 'texto',
            ordem: 1,
            modulo: { id: 30, documentId: 'modulo-externo' },
          },
        ])
      );

    await expect(listarModulosCurso('curso-1', 'curso-document-id')).rejects.toThrow(
      'Item de módulo item-externo sem relação de módulo resolvível'
    );
  });
});
