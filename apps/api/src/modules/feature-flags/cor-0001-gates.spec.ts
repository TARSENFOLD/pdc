import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type MiddlewareHandler } from 'hono';
import type { AuthVariables } from '../auth/auth.middleware.js';
import {
  requireCertificatesEnabled,
  requireContentSubmissionEnabled,
  requireExternalCreatorOnboarding,
  requireExternalProjectPublication,
  requireInternalQaCreatorAccess,
} from './cor-0001-gates.js';
import { featureFlagService } from './feature-flags.service.js';
import {
  filterVwxExperiences,
  isVwxCatalogEnabled,
} from './vwx-catalog-gate.js';

vi.mock('./feature-flags.service.js', () => ({
  featureFlagService: {
    isEnabled: vi.fn(),
  },
}));

type Vars = { Variables: AuthVariables };
type Role = AuthVariables['user']['role'];

function protectedApp(
  role: Role,
  gate: MiddlewareHandler<Vars>,
  instituicaoId?: number,
) {
  const app = new Hono<Vars>();
  app.use('*', async (c, next) => {
    c.set('user', { id: 'actor-1', role, instituicaoId });
    await next();
  });
  app.post('/action', gate, (c) => c.json({ ok: true }));
  return app;
}

describe('COR-0001 BFF feature gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(featureFlagService.isEnabled).mockResolvedValue(false);
  });

  it('não provisiona onboarding externo quando o flag está desligado', async () => {
    const app = new Hono();
    app.post('/register/mentor', requireExternalCreatorOnboarding(), (c) => (
      c.json({ provisioned: true }, 201)
    ));

    const res = await app.request('/register/mentor', { method: 'POST' });

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      code: 'EXTERNAL_CREATOR_ONBOARDING_TEMPORARILY_DISABLED',
    });
  });

  it('bloqueia submissão directa no BFF', async () => {
    const res = await protectedApp(
      'mentor',
      requireContentSubmissionEnabled(),
    ).request('/action', { method: 'POST' });

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      code: 'CONTENT_SUBMISSION_TEMPORARILY_DISABLED',
    });
  });

  it('permite que a conta interna de QA guarde drafts', async () => {
    const res = await protectedApp(
      'super_admin',
      requireInternalQaCreatorAccess(),
    ).request('/action', { method: 'POST' });

    expect(res.status).toBe(200);
    expect(featureFlagService.isEnabled).not.toHaveBeenCalled();
  });

  it('bloqueia builders e projectos para contas externas', async () => {
    const creator = await protectedApp(
      'instituicao',
      requireInternalQaCreatorAccess(),
    ).request('/action', { method: 'POST' });
    const project = await protectedApp(
      'estudante',
      requireExternalProjectPublication(),
    ).request('/action', { method: 'POST' });

    expect(creator.status).toBe(503);
    expect(project.status).toBe(503);
  });

  it('aplica o override da instituição no acesso ao builder', async () => {
    vi.mocked(featureFlagService.isEnabled).mockImplementation(
      (flag, instituicaoId) => Promise.resolve(
        flag === 'external_creator_onboarding_enabled' && instituicaoId === 42
      ),
    );

    const res = await protectedApp(
      'instituicao',
      requireInternalQaCreatorAccess(),
      42,
    ).request('/action', { method: 'POST' });

    expect(res.status).toBe(200);
    expect(featureFlagService.isEnabled).toHaveBeenCalledWith(
      'external_creator_onboarding_enabled',
      42,
    );
  });

  it('aplica o override da instituição na submissão de conteúdo', async () => {
    vi.mocked(featureFlagService.isEnabled).mockImplementation(
      (flag, instituicaoId) => Promise.resolve(
        flag === 'content_submission_enabled' && instituicaoId === 42
      ),
    );

    const res = await protectedApp(
      'instituicao',
      requireContentSubmissionEnabled(),
      42,
    ).request('/action', { method: 'POST' });

    expect(res.status).toBe(200);
    expect(featureFlagService.isEnabled).toHaveBeenCalledWith(
      'content_submission_enabled',
      42,
    );
  });

  it.each([
    {
      flag: 'certificates_enabled' as const,
      gate: requireCertificatesEnabled(),
    },
    {
      flag: 'external_project_publication_enabled' as const,
      gate: requireExternalProjectPublication(),
    },
  ])('mantém $flag fail-closed no contexto institucional', async ({ flag, gate }) => {
    vi.mocked(featureFlagService.isEnabled).mockImplementation(
      (receivedFlag, instituicaoId) => {
        if (receivedFlag === flag && instituicaoId === 42) {
          return Promise.reject(new Error('Strapi indisponível'));
        }
        return Promise.resolve(false);
      },
    );

    const res = await protectedApp(
      'instituicao',
      gate,
      42,
    ).request('/action', { method: 'POST' });

    expect(res.status).toBe(503);
    expect(featureFlagService.isEnabled).toHaveBeenCalledWith(flag, 42);
  });

  it('bloqueia a API de certificados enquanto a rota mostra o empty state', async () => {
    const res = await protectedApp(
      'estudante',
      requireCertificatesEnabled(),
    ).request('/action', { method: 'POST' });

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      code: 'CERTIFICATES_TEMPORARILY_DISABLED',
    });
  });

  it('mantém as protecções fail-closed quando o registry remoto falha', async () => {
    vi.mocked(featureFlagService.isEnabled).mockRejectedValue(
      new Error('Strapi indisponível'),
    );

    const res = await protectedApp(
      'mentor',
      requireContentSubmissionEnabled(),
    ).request('/action', { method: 'POST' });

    expect(res.status).toBe(503);
  });

  it('remove apenas VWX das respostas públicas', async () => {
    expect(await isVwxCatalogEnabled()).toBe(false);
    expect(filterVwxExperiences([
      { id: 'inst-1', tipoExperiencia: 'institucional' },
      { id: 'vwx-1', tipoExperiencia: 'vwx' },
      { id: 'legacy-1' },
    ], false)).toEqual([
      { id: 'inst-1', tipoExperiencia: 'institucional' },
      { id: 'legacy-1' },
    ]);
  });
});
