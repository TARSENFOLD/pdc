import { describe, expect, it, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { consentService } from './consent.service.js';
import { strapiGet, strapiPost, strapiPut } from '../strapi/strapi.client.js';
import { writeAuditLog } from '../../middleware/audit.js';
import { ConsentStateSchema, type ConsentType, type StrapiListResponse } from '@pdc/shared';

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
  strapiPut: vi.fn(),
}));

vi.mock('../../middleware/audit.js', () => ({
  writeAuditLog: vi.fn(),
}));

interface PerfilConsentFixture {
  id: string;
  consents: unknown;
}

function perfilResponse(consents: unknown): StrapiListResponse<PerfilConsentFixture> {
  return {
    data: [{ id: 'perfil-1', consents }],
    meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
  };
}

const PerfilPutBodySchema = z.object({
  consents: z.unknown(),
});

function hasPersistedConsent(tipo: ConsentType): boolean {
  return vi.mocked(strapiPut).mock.calls.some(([path, body]) => {
    if (path !== '/perfis/perfil-doc-1') {
      return false;
    }
    const parsedBody = PerfilPutBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return false;
    }
    const parsedConsents = ConsentStateSchema.safeParse(parsedBody.data.consents);
    return parsedConsents.success && parsedConsents.data[tipo]?.concedido === true;
  });
}

describe('consentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('faz dupla escrita: perfil.consents e consentimento append-only', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(perfilResponse({}))
      .mockResolvedValueOnce(perfilResponse({
        termos: {
          tipo: 'termos',
          versao: 'termos-uso@2026-06-22',
          concedido: true,
          at: '2026-06-22T00:00:00.000Z',
        },
      }));
    vi.mocked(strapiPost).mockResolvedValue({ data: { id: 'consent-1' }, meta: {} });
    vi.mocked(strapiPut).mockResolvedValue({ data: { id: 'perfil-1' }, meta: {} });
    vi.mocked(writeAuditLog).mockResolvedValue(undefined);

    await consentService.recordLegalAcceptance({
      userId: 'user-1',
      perfilId: 'perfil-1',
      perfilDocumentId: 'perfil-doc-1',
      actorRole: 'estudante',
      source: 'registo_email',
      dataNascimento: '2008-01-01',
      aceiteLegal: {
        termosUso: true,
        politicaPrivacidade: true,
        tratamentoDados: true,
        termosUsoVersao: 'termos-uso@2026-06-22',
        politicaPrivacidadeVersao: 'politica-privacidade@2026-06-22',
        tratamentoDadosVersao: 'tratamento-dados@2026-06-22',
      },
    });

    expect(hasPersistedConsent('termos')).toBe(true);
    expect(hasPersistedConsent('privacidade')).toBe(true);
    expect(strapiPost).toHaveBeenCalledWith('/consentimentos', expect.objectContaining({
      perfil: 'perfil-doc-1',
    }));
    expect(strapiPost).toHaveBeenCalledTimes(3);
    expect(writeAuditLog).toHaveBeenCalledTimes(3);
  });
});
