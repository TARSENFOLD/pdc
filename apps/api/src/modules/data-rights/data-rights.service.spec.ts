import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dataRightsService } from './data-rights.service.js';
import { strapiGet, strapiPut, strapiPutRaw } from '../strapi/strapi.client.js';
import { writeAuditLog } from '../../middleware/audit.js';

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPut: vi.fn(),
  strapiPutRaw: vi.fn(),
}));

vi.mock('../../middleware/audit.js', () => ({
  writeAuditLog: vi.fn(),
}));

function listResponse<T>(data: T[]) {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

describe('dataRightsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exporta os dados do titular e regista auditoria', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 10, documentId: 'perfil-doc-1', userId: 'user-1' }]))
      .mockResolvedValueOnce(listResponse([{ id: 1, tipo: 'termos' }]))
      .mockResolvedValueOnce(listResponse([{ id: 2, atual: true }]))
      .mockResolvedValueOnce(listResponse([{ id: 3, status: 'aprovado' }]))
      .mockResolvedValueOnce(listResponse([{ id: 4, canal: 'interno' }]));
    vi.mocked(writeAuditLog).mockResolvedValue(undefined);

    const result = await dataRightsService.exportUserData({
      userId: 'user-1',
      role: 'estudante',
      ip: '127.0.0.1',
    });

    expect(result.userId).toBe('user-1');
    expect(result.perfil?.id).toBe(10);
    expect(result.consents).toHaveLength(1);
    expect(result.perfilVocacional).toHaveLength(1);
    expect(result.vinculos).toHaveLength(1);
    expect(result.partilhas).toHaveLength(1);
    expect(strapiGet).toHaveBeenCalledWith('/partilhas', {
      'filters[actor][userId][$eq]': 'user-1',
      'pagination[pageSize]': '100',
      populate: 'actor',
    });
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      accao: 'dados_exportados',
      recurso: 'data-rights',
    }));
  });

  it('anonimiza perfil e user, revoga vínculos e retém auditoria', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 10, documentId: 'perfil-doc-1', userId: 'user-1' }]))
      .mockResolvedValueOnce(listResponse([{ id: 20, documentId: 'vinculo-doc-1' }]));
    vi.mocked(strapiPut).mockResolvedValue({ data: { id: 10 }, meta: {} });
    vi.mocked(strapiPutRaw).mockResolvedValue({ id: 'user-1' });
    vi.mocked(writeAuditLog).mockResolvedValue(undefined);

    const result = await dataRightsService.softDeleteAndAnonymize({
      userId: 'user-1',
      role: 'estudante',
      ip: '127.0.0.1',
    });

    expect(result).toEqual({ anonymized: true, perfilId: '10', revokedVinculos: 1 });
    expect(strapiPut).toHaveBeenCalledWith('/perfis/perfil-doc-1', expect.objectContaining({
      nome: 'Utilizador anonimizado',
      email: 'anon-user-1@anon.usepdc.local',
      ativo: false,
      contaEstado: 'anonimizada',
    }));
    expect(strapiPut).toHaveBeenCalledWith('/vinculos/vinculo-doc-1', expect.objectContaining({
      status: 'rejeitado',
    }));
    expect(strapiPutRaw).toHaveBeenCalledWith('/users/user-1', expect.objectContaining({
      email: 'anon-user-1@anon.usepdc.local',
      blocked: true,
    }));
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      accao: 'conta_anonimizada',
      recurso: 'data-rights',
    }));
  });

  it('apaga perfil vocacional desativando snapshots sem destruir registos', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 10, documentId: 'perfil-doc-1', userId: 'user-1' }]))
      .mockResolvedValueOnce(listResponse([
        { id: 30, documentId: 'snapshot-doc-1', atual: true },
        { id: 31, documentId: 'snapshot-doc-2', atual: false },
      ]));
    vi.mocked(strapiPut).mockResolvedValue({ data: { id: 30 }, meta: {} });
    vi.mocked(writeAuditLog).mockResolvedValue(undefined);

    const result = await dataRightsService.deleteVocationalProfile({
      userId: 'user-1',
      role: 'estudante',
      ip: '127.0.0.1',
    });

    expect(result).toEqual({ deletedSnapshots: 2 });
    expect(strapiPut).toHaveBeenCalledWith('/perfil-vocacionais/snapshot-doc-1', { atual: false });
    expect(strapiPut).toHaveBeenCalledWith('/perfil-vocacionais/snapshot-doc-2', { atual: false });
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      accao: 'perfil_vocacional_apagado',
      recurso: 'data-rights',
    }));
  });

  it('revoga acessos sem anonimizar a conta', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{ id: 20, documentId: 'vinculo-doc-1' }]));
    vi.mocked(strapiPut).mockResolvedValue({ data: { id: 20 }, meta: {} });
    vi.mocked(writeAuditLog).mockResolvedValue(undefined);

    const result = await dataRightsService.revokeAccesses({
      userId: 'user-1',
      role: 'estudante',
      ip: '127.0.0.1',
    });

    expect(result).toEqual({ revokedVinculos: 1 });
    expect(strapiPut).toHaveBeenCalledWith('/vinculos/vinculo-doc-1', expect.objectContaining({
      status: 'rejeitado',
    }));
    expect(strapiPutRaw).not.toHaveBeenCalled();
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      accao: 'acessos_revogados',
      recurso: 'data-rights',
    }));
  });
});
