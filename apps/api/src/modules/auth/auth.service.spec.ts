import { beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeJwt } from 'jose';
import { z } from 'zod';
import { DomainEventName, UserSchema } from '@pdc/shared';

const publishWithOutboxMock = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'evt-auth-1' }));

vi.mock('../../lib/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret-mock-safeguard',
    API_URL: 'http://localhost:3000',
    FRONTEND_URL: 'http://localhost:5173',
  },
}));

vi.mock('../../lib/redis.js', () => ({
  redis: { set: vi.fn(), get: vi.fn(), del: vi.fn(), eval: vi.fn().mockResolvedValue(1) },
}));

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGetRaw: vi.fn(),
  strapiPostRaw: vi.fn(),
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
  strapiPut: vi.fn(),
  strapiDelete: vi.fn(),
  strapiDeleteRaw: vi.fn(),
}));

vi.mock('../consent/consent.service.js', () => ({
  consentService: {
    recordLegalAcceptance: vi.fn(),
  },
}));

vi.mock('../reputation/reputation.service.js', () => ({
  getReputacao: vi.fn().mockResolvedValue(0),
  getTier: vi.fn().mockReturnValue('BRONZE'),
}));

vi.mock('../events/event-bus.js', () => ({
  eventBus: {
    publishWithOutbox: publishWithOutboxMock,
  },
}));

import { authService } from './auth.service.js';
import { authSessionService } from './auth-session.service.js';
import { strapiDelete, strapiDeleteRaw, strapiGetRaw, strapiPostRaw, strapiGet, strapiPost, strapiPut } from '../strapi/strapi.client.js';
import { consentService } from '../consent/consent.service.js';

const BASE_USER = {
  id: 42,
  email: 'user@pdc.ao',
  username: 'user@pdc.ao',
  role: { name: 'Authenticated' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const BASE_PERFIL = {
  id: 'perfil-1',
  documentId: 'perfil-doc-1',
  userId: '42',
  nome: 'Ana Ferreira',
  tipo: 'estudante',
  bio: 'Estudante de Engenharia',
  areasInteresse: ['TECNOLOGIA'],
  conquistas: [],
};

const CreateStrapiUserPayloadSchema = z.object({
  email: z.literal('user@pdc.ao'),
  username: z.literal('user@pdc.ao'),
  confirmed: z.literal(true),
  role: z.literal(1),
  password: z.string().min(1),
});

const LEGAL_ACCEPTANCE = {
  termosUso: true,
  politicaPrivacidade: true,
  tratamentoDados: true,
  termosUsoVersao: 'termos-uso@2026-06-22',
  politicaPrivacidadeVersao: 'politica-privacidade@2026-06-22',
  tratamentoDadosVersao: 'tratamento-dados@2026-06-22',
} as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authService.mapStrapiUser — new fields', () => {
  it('não emite claims nulas no access token', async () => {
    const user = authService.mapStrapiUser(BASE_USER, {
      ...BASE_PERFIL,
      tipo: 'instituicao',
      onboardingCompleto: null,
      consentimentoEstado: null,
      estadoMenoridade: 'pendente',
    });

    const { accessToken } = await authSessionService.issue(user);
    const claims = decodeJwt(accessToken);
    expect(claims).not.toHaveProperty('onboardingCompleto');
    expect(claims).not.toHaveProperty('consentimentoEstado');
    expect(claims.estadoMenoridade).toBe('pendente');
    expect(claims.isMinor).toBe(false);
  });

  it('maps aprovado from perfil', () => {
    const user = authService.mapStrapiUser(BASE_USER, { ...BASE_PERFIL, aprovado: false });
    expect(user.aprovado).toBe(false);
  });

  it('maps aprovado=true from perfil', () => {
    const user = authService.mapStrapiUser(BASE_USER, { ...BASE_PERFIL, aprovado: true });
    expect(user.aprovado).toBe(true);
  });

  it('maps oauthVerified from perfil', () => {
    const user = authService.mapStrapiUser(BASE_USER, { ...BASE_PERFIL, oauthVerified: true });
    expect(user.oauthVerified).toBe(true);
  });

  it('maps oauthProvider google', () => {
    const user = authService.mapStrapiUser(BASE_USER, { ...BASE_PERFIL, oauthProvider: 'google' });
    expect(user.oauthProvider).toBe('google');
  });

  it('maps oauthProvider linkedin', () => {
    const user = authService.mapStrapiUser(BASE_USER, { ...BASE_PERFIL, oauthProvider: 'linkedin' });
    expect(user.oauthProvider).toBe('linkedin');
  });

  it('ignores unknown oauthProvider', () => {
    const user = authService.mapStrapiUser(BASE_USER, { ...BASE_PERFIL, oauthProvider: 'github' });
    expect(user.oauthProvider).toBeUndefined();
  });

  it('maps onboardingCompleto from perfil', () => {
    const user = authService.mapStrapiUser(BASE_USER, { ...BASE_PERFIL, onboardingCompleto: false });
    expect(user.onboardingCompleto).toBe(false);
  });

  it('deriva isMinor e preserva estado atual de consentimentos', () => {
    const user = authService.mapStrapiUser(BASE_USER, {
      ...BASE_PERFIL,
      dataNascimento: '2010-01-01',
      consents: {
        termos: {
          tipo: 'termos',
          versao: 'termos-uso@2026-06-22',
          concedido: true,
          at: '2026-06-22T00:00:00.000Z',
        },
      },
    });
    expect(user.isMinor).toBe(true);
    expect(user.estadoMenoridade).toBe('menor');
    expect(user.consents?.termos?.concedido).toBe(true);
  });

  it('leaves new fields undefined when perfil is null', () => {
    const user = authService.mapStrapiUser(BASE_USER, null);
    expect(user.aprovado).toBeUndefined();
    expect(user.oauthVerified).toBeUndefined();
    expect(user.oauthProvider).toBeUndefined();
    expect(user.onboardingCompleto).toBeUndefined();
  });

  it('normaliza campos opcionais nulos devolvidos pelo Strapi', () => {
    const user = authService.mapStrapiUser(BASE_USER, {
      ...BASE_PERFIL,
      bio: null,
      bannerUrl: null,
      aprovado: null,
      oauthVerified: null,
      oauthProvider: null,
    });

    expect(UserSchema.parse(user)).toEqual(user);
    expect(user.bio).toBeUndefined();
    expect(user.bannerUrl).toBeUndefined();
    expect(user.aprovado).toBeUndefined();
    expect(user.oauthVerified).toBeUndefined();
    expect(user.oauthProvider).toBeUndefined();
  });

  it('preserves existing fields unchanged', () => {
    const user = authService.mapStrapiUser(BASE_USER, BASE_PERFIL);
    expect(user.id).toBe('42');
    expect(user.email).toBe('user@pdc.ao');
    expect(user.nome).toBe('Ana Ferreira');
    expect(user.role).toBe('estudante');
    expect(user.perfilId).toBe('perfil-1');
  });
});

describe('authSessionService access claims', () => {
  it('includes the canonical perfilId in the access token', async () => {
    const user = authService.mapStrapiUser(BASE_USER, BASE_PERFIL);
    const { accessToken } = await authSessionService.issue(user);

    expect(decodeJwt(accessToken)).toMatchObject({
      sub: '42',
      role: 'estudante',
      perfilId: 'perfil-1',
      isMinor: false,
    });
  });

  it('normalizes numeric Strapi profile ids before signing access tokens', async () => {
    const user = authService.mapStrapiUser(BASE_USER, { ...BASE_PERFIL, id: 42 });
    const { accessToken } = await authSessionService.issue(user);

    expect(user.perfilId).toBe('42');
    expect(decodeJwt(accessToken)).toMatchObject({ perfilId: '42' });
  });
});

describe('authService.setOauthProvider', () => {
  it('updates a Strapi v5 profile through documentId', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce({
      data: [{ ...BASE_PERFIL }],
      meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 } },
    });

    await authService.setOauthProvider('42', 'linkedin');

    expect(strapiPut).toHaveBeenCalledWith('/perfis/perfil-doc-1', { oauthProvider: 'linkedin' });
    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.OAUTH_VINCULADO, {
      userId: '42',
      provider: 'linkedin',
    });
  });
});

describe('authService.findOrCreateUser', () => {
  it('creates OAuth users with a generated password for Strapi users-permissions', async () => {
    vi.mocked(strapiGetRaw)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ roles: [{ id: 1, name: 'Authenticated', type: 'authenticated' }] })
      .mockResolvedValueOnce(BASE_USER);
    vi.mocked(strapiPostRaw).mockResolvedValueOnce(BASE_USER);
    vi.mocked(strapiPost).mockResolvedValueOnce({ data: { ...BASE_PERFIL }, meta: {} });
    vi.mocked(strapiGet).mockResolvedValueOnce({
      data: [{ ...BASE_PERFIL }],
      meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 } },
    });

    await authService.findOrCreateUser('USER@PDC.AO', 'Ana Ferreira');

    const createUserCall = vi.mocked(strapiPostRaw).mock.calls[0];
    expect(createUserCall?.[0]).toBe('/users');
    CreateStrapiUserPayloadSchema.parse(createUserCall?.[1]);
    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.PERFIL_CRIADO, {
      perfilId: 'perfil-1',
      role: 'estudante',
    });
  });
});

describe('authService.registerWithRole', () => {
  it('rejects duplicate email before calling Strapi local register', async () => {
    vi.mocked(strapiGetRaw).mockResolvedValueOnce([BASE_USER]);

    await expect(
      authService.registerWithRole('USER@PDC.AO', 'SenhaTeste123', 'Ana Ferreira', 'estudante', {})
    ).rejects.toMatchObject({
      status: 409,
      message: 'Já existe uma conta com este email. Inicia sessão ou usa recuperação de palavra-passe.',
    });

    expect(strapiGetRaw).toHaveBeenCalledWith('/users', {
      'filters[email][$eq]': 'user@pdc.ao',
      'pagination[pageSize]': '1',
    });
    expect(strapiPostRaw).not.toHaveBeenCalledWith('/auth/local/register', expect.anything());
  });

  it('compensa user e perfil quando o registo append-only de consentimento falha', async () => {
    vi.mocked(strapiGetRaw).mockResolvedValueOnce([]);
    vi.mocked(strapiPostRaw).mockResolvedValueOnce({ user: BASE_USER });
    vi.mocked(strapiPost).mockResolvedValueOnce({ data: { ...BASE_PERFIL }, meta: {} });
    vi.mocked(consentService.recordLegalAcceptance).mockRejectedValueOnce(new Error('consentimento indisponível'));
    vi.mocked(strapiGet).mockResolvedValueOnce({
      data: [{ ...BASE_PERFIL }],
      meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 } },
    });
    vi.mocked(strapiDelete).mockResolvedValueOnce(undefined);
    vi.mocked(strapiDeleteRaw).mockResolvedValueOnce(undefined);

    await expect(
      authService.registerWithRole('USER@PDC.AO', 'SenhaTeste123', 'Ana Ferreira', 'estudante', {}, {
        aceiteLegal: LEGAL_ACCEPTANCE,
        dataNascimento: '2000-01-01',
        source: 'registo_email',
      }),
    ).rejects.toThrow('consentimento indisponível');

    expect(strapiDelete).toHaveBeenCalledWith('/perfis/perfil-doc-1');
    expect(strapiDeleteRaw).toHaveBeenCalledWith('/users/42');
    expect(publishWithOutboxMock).not.toHaveBeenCalledWith(DomainEventName.PERFIL_CRIADO, expect.anything());
  });

  it('emite PERFIL_CRIADO após registo email bem-sucedido', async () => {
    vi.mocked(strapiGetRaw)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(BASE_USER);
    vi.mocked(strapiPostRaw).mockResolvedValueOnce({ user: BASE_USER });
    vi.mocked(strapiPost).mockResolvedValueOnce({ data: { ...BASE_PERFIL }, meta: {} });
    vi.mocked(strapiGet).mockResolvedValueOnce({
      data: [{ ...BASE_PERFIL }],
      meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 } },
    });

    await authService.registerWithRole('USER@PDC.AO', 'SenhaTeste123', 'Ana Ferreira', 'mentor', { areaFormacao: 'Engenharia' });

    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.PERFIL_CRIADO, {
      perfilId: 'perfil-1',
      role: 'mentor',
    });
  });
});
