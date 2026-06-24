import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  VOCACIONAL_EXPLANATION_VERSION,
  VOCACIONAL_HEURISTICS_VERSION,
  VOCACIONAL_MODEL_VERSION,
  type PerfilVocacional,
  type StrapiListResponse,
} from '@pdc/shared';

const strapiGetMock = vi.hoisted(() => vi.fn());
const strapiPostMock = vi.hoisted(() => vi.fn());
const strapiPutMock = vi.hoisted(() => vi.fn());
const calcularPerfilMock = vi.hoisted(() => vi.fn());
const gerarRecomendacoesMock = vi.hoisted(() => vi.fn());

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: strapiGetMock,
  strapiPost: strapiPostMock,
  strapiPut: strapiPutMock,
}));

vi.mock('./vocacional.service.js', () => ({
  vocacionalService: {
    calcularPerfil: calcularPerfilMock,
    gerarRecomendacoes: gerarRecomendacoesMock,
  },
}));

import { vocacionalSnapshotService } from './vocacional.snapshot.service.js';

function listResponse<T>(data: Array<T & { id: string | number }>): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

const PERFIL: PerfilVocacional = {
  id: 'perfil-1',
  perfilId: 'perfil-1',
  scoreGlobal: 82,
  certeza: 'ALTA',
  totalEventos: 60,
  areaMatch: 'TECNOLOGIA',
  aptidao: 0.82,
  dedicacao: 0.6,
  dimensoes: { fluidez: 8, resiliencia: 7, foco: 8, hesitacao: 1 },
  createdAt: '2026-06-22T10:00:00.000Z',
  updatedAt: '2026-06-22T10:00:00.000Z',
  modelVersion: VOCACIONAL_MODEL_VERSION,
  heuristicsVersion: VOCACIONAL_HEURISTICS_VERSION,
  explanationVersion: VOCACIONAL_EXPLANATION_VERSION,
  generatedWithAiSupport: false,
  calculationMethod: 'heuristico_deterministico',
};

describe('vocacionalSnapshotService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calcularPerfilMock.mockResolvedValue(PERFIL);
    gerarRecomendacoesMock.mockResolvedValue([{ id: 'curso-1', titulo: 'Curso', tipo: 'curso', matchPercentagem: 90, motivo: 'Match' }]);
    strapiPostMock.mockResolvedValue({ data: { id: 'snapshot-new' } });
    strapiPutMock.mockResolvedValue({ data: { id: 'snapshot-old' } });
  });

  it('creates an append-only current snapshot and demotes previous current snapshots', async () => {
    strapiGetMock
      .mockResolvedValueOnce(listResponse([{ id: 'snapshot-old', documentId: 'snapshot-doc-old' }]))
      .mockResolvedValueOnce(listResponse([]));

    const result = await vocacionalSnapshotService.gerar('user-1');

    expect(strapiPutMock).toHaveBeenCalledWith('/perfil-vocacionais/snapshot-doc-old', { atual: false });
    expect(strapiPostMock).toHaveBeenCalledWith('/perfil-vocacionais', expect.objectContaining({
      perfil: 'perfil-1',
      atual: true,
      areaMatch: 'TECNOLOGIA',
      modelVersion: VOCACIONAL_MODEL_VERSION,
      heuristicsVersion: VOCACIONAL_HEURISTICS_VERSION,
      explanationVersion: VOCACIONAL_EXPLANATION_VERSION,
    }));
    expect(result.scoreGlobal).toBe(82);
    expect(result.recomendacoes).toHaveLength(1);
  });

  it('reads the current snapshot without writing', async () => {
    strapiGetMock
      .mockResolvedValueOnce(listResponse([{ id: 'perfil-1', documentId: 'perfil-doc-1' }]))
      .mockResolvedValueOnce(listResponse([{
        id: 'snapshot-1',
        perfil: { id: 'perfil-1' },
        scoreGlobal: 75,
        certeza: 'MEDIA',
        totalEventos: 20,
        areaMatch: 'ENGENHARIA',
        dimensoes: { fluidez: 6, resiliencia: 6, foco: 6, hesitacao: 2 },
        createdAt: '2026-06-22T09:00:00.000Z',
      }]))
      .mockResolvedValueOnce(listResponse([]));

    const result = await vocacionalSnapshotService.getAtual('user-1');

    expect(result?.areaMatch).toBe('ENGENHARIA');
    expect(strapiPostMock).not.toHaveBeenCalled();
    expect(strapiPutMock).not.toHaveBeenCalled();
  });
});
