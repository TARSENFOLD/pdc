import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainEventName, type StrapiListResponse, type StrapiSingleResponse } from '@pdc/shared';
import { instituicaoService } from './instituicao.service.js';
import { strapiGet, strapiPut } from '../strapi/strapi.client.js';
import { redis } from '../../lib/redis.js';
import type { StrapiInstituicao, StrapiPerfilGestor } from './instituicao.types.js';

const publishWithOutboxMock = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'evt-instituicao-1' }));

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPut: vi.fn(),
}));

vi.mock('../events/event-bus.js', () => ({
  eventBus: {
    publishWithOutbox: publishWithOutboxMock,
  },
}));

vi.mock('../../lib/redis.js', () => ({
  redis: {
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  },
}));

// Nota: redis mock mantido para evitar exceções se o service adicionar cache invalidation no futuro.

function listResponse<T>(data: Array<T & { id: string | number }>): StrapiListResponse<T> {
  return { data, meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } } };
}

function singleResponse<T>(data: T & { id: string | number }): StrapiSingleResponse<T> {
  return { data, meta: {} };
}

function instituicao(overrides: Partial<StrapiInstituicao> = {}): StrapiInstituicao {
  return {
    id: 'inst-1',
    documentId: 'doc-inst-1',
    slug: 'instituicao-pdc',
    nome: 'Instituição PDC',
    nomeLegal: 'Instituição PDC, S.A.',
    tipo: 'universidade',
    natureza: 'privada',
    nif: '5000000000',
    estado: 'draft',
    enderecoEstruturado: { provincia: 'Luanda', municipio: 'Luanda', endereco: 'Rua PDC' },
    contactosInstitucionais: [{ tipo: 'email', valor: 'info@pdc.test', publico: true }],
    niveisEnsino: ['superior'],
    areasAtividade: ['TECNOLOGIA'],
    infraestruturas: ['laboratorio'],
    documentosLegais: [{ tipo: 'nif', storageKey: 'private/nif.pdf' }],
    logoUrl: 'https://cdn.pdc.test/logo.png',
    ...overrides,
  };
}

function perfilGestor(instituicaoGerida: StrapiInstituicao): StrapiPerfilGestor {
  return { id: 'perfil-inst-1', userId: 'user-inst-1', instituicaoGerida };
}

describe('instituicaoService G15 events', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(strapiPut).mockResolvedValue(singleResponse({ id: 'inst-1' }));
    vi.mocked(redis.set).mockResolvedValue('OK');
    vi.mocked(redis.del).mockResolvedValue(1);
    publishWithOutboxMock.mockResolvedValue({
      id: 'evt-instituicao-1',
      name: DomainEventName.INSTITUICAO_ATUALIZADA,
      payload: {},
      timestamp: new Date().toISOString(),
      correlationId: 'evt-instituicao-1',
    });
  });

  it('update emite INSTITUICAO_ATUALIZADA com secção', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([perfilGestor(instituicao())]))
      .mockResolvedValueOnce(listResponse([instituicao({ nome: 'Instituição Atualizada' })]));

    await instituicaoService.update('user-inst-1', 'identidade', { nome: 'Instituição Atualizada' });

    expect(strapiPut).toHaveBeenCalledWith('/instituicoes/doc-inst-1', { nome: 'Instituição Atualizada' });
    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.INSTITUICAO_ATUALIZADA, {
      instituicaoId: 'inst-1',
      userId: 'user-inst-1',
      seccao: 'identidade',
    });
  });

  it('submeter emite INSTITUICAO_SUBMETIDA', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([perfilGestor(instituicao())]))
      .mockResolvedValueOnce(listResponse([instituicao()]))
      .mockResolvedValueOnce(listResponse([instituicao({ estado: 'pending_review' })]));

    await instituicaoService.submeter('user-inst-1');

    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.INSTITUICAO_SUBMETIDA, {
      instituicaoId: 'inst-1',
      userId: 'user-inst-1',
    });
  });

  it('moderar verified emite INSTITUICAO_VERIFICADA', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([instituicao({ estado: 'pending_review' })]))
      .mockResolvedValueOnce(listResponse([instituicao({ estado: 'verified' })]));

    await instituicaoService.moderar('inst-1', 'admin-1', 'verified');

    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.INSTITUICAO_VERIFICADA, {
      instituicaoId: 'inst-1',
      aprovadorId: 'admin-1',
    });
  });

  it('moderar changes_requested emite INSTITUICAO_ALTERACOES_SOLICITADAS', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([instituicao({ estado: 'pending_review' })]))
      .mockResolvedValueOnce(listResponse([instituicao({ estado: 'changes_requested' })]));

    await instituicaoService.moderar('inst-1', 'admin-1', 'changes_requested', 'Falta documento legal atualizado.');

    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.INSTITUICAO_ALTERACOES_SOLICITADAS, {
      instituicaoId: 'inst-1',
      aprovadorId: 'admin-1',
      motivo: 'Falta documento legal atualizado.',
    });
  });
});