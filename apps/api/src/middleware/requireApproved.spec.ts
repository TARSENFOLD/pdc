import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context } from 'hono';

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

const strapiGetMock = vi.hoisted(() => vi.fn());
const isEnabledMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret',
    API_URL: 'http://localhost:3000',
    FRONTEND_URL: 'http://localhost:5173',
  },
}));

vi.mock('../lib/redis.js', () => ({
  redis: redisMock,
  hasRedis: true,
}));

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: strapiGetMock,
}));

vi.mock('../modules/feature-flags/feature-flags.service.js', () => ({
  featureFlagService: {
    isEnabled: isEnabledMock,
  },
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: {
    register: vi.fn(),
  },
}));

import { requireApproved } from './requireApproved.js';
import type { AuthVariables } from '../modules/auth/auth.middleware.js';

type Vars = { Variables: AuthVariables };

function buildApp(role: string, instituicaoId?: number) {
  const app = new Hono<Vars>();
  app.use('*', async (c: Context<Vars>, next) => {
    c.set('user', {
      id: 'user-1',
      role: role as AuthVariables['user']['role'],
      instituicaoId,
    });
    await next();
  });
  app.post('/content', requireApproved(), (c) => c.json({ ok: true }, 201));
  return app;
}

function mockFlagOn() {
  isEnabledMock.mockResolvedValue(true);
}

function mockFlagOff() {
  isEnabledMock.mockResolvedValue(false);
}

function mockPerfil(aprovado: boolean) {
  redisMock.get.mockResolvedValue(null);
  redisMock.set.mockResolvedValue('OK');
  strapiGetMock.mockResolvedValue({
    data: [{ id: 'perfil-1', userId: 'user-1', aprovado }],
    meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
  });
}

function mockInstituicao(estado: string) {
  redisMock.get.mockResolvedValue(null);
  redisMock.set.mockResolvedValue('OK');
  strapiGetMock.mockResolvedValue({
    data: [{ id: 'perfil-1', userId: 'user-1', instituicaoGerida: { id: 7, estado } }],
    meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
  });
}

function mockCacheHit(aprovado: boolean) {
  redisMock.get.mockResolvedValue(aprovado);
}

async function post(app: ReturnType<typeof buildApp>) {
  return app.request('/content', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
}

describe('requireApproved — kill-switch (flag OFF)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFlagOff();
  });

  const allRoles = ['estudante', 'mentor', 'instituicao', 'moderador', 'comite_cientifico', 'super_admin'];

  for (const role of allRoles) {
    it(`${role} + flag off → passes (201)`, async () => {
      const res = await post(buildApp(role));
      expect(res.status).toBe(201);
      expect(strapiGetMock).not.toHaveBeenCalled();
    });
  }
});

describe('requireApproved — bypass roles (flag ON)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFlagOn();
  });

  const bypassRoles = ['estudante', 'super_admin', 'comite_cientifico', 'moderador'];

  for (const role of bypassRoles) {
    it(`${role} + flag on → passes (201) without Strapi lookup`, async () => {
      const res = await post(buildApp(role));
      expect(res.status).toBe(201);
      expect(strapiGetMock).not.toHaveBeenCalled();
    });
  }
});

describe('requireApproved — mentor (flag ON)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFlagOn();
  });

  it('mentor + aprovado=true → 201', async () => {
    mockPerfil(true);
    const res = await post(buildApp('mentor'));
    expect(res.status).toBe(201);
  });

  it('mentor + aprovado=false → 403 with PERFIL_NAO_APROVADO', async () => {
    mockPerfil(false);
    const res = await post(buildApp('mentor'));
    expect(res.status).toBe(403);
    const body = await res.json() as { code: string };
    expect(body.code).toBe('PERFIL_NAO_APROVADO');
  });

  it('mentor + cache hit (aprovado=true) → 201 without Strapi call', async () => {
    mockCacheHit(true);
    const res = await post(buildApp('mentor'));
    expect(res.status).toBe(201);
    expect(strapiGetMock).not.toHaveBeenCalled();
  });

  it('mentor + cache hit (aprovado=false) → 403 without Strapi call', async () => {
    mockCacheHit(false);
    const res = await post(buildApp('mentor'));
    expect(res.status).toBe(403);
    expect(strapiGetMock).not.toHaveBeenCalled();
  });

  it('mentor + Strapi unavailable → 503', async () => {
    redisMock.get.mockResolvedValue(null);
    strapiGetMock.mockRejectedValue(new Error('Strapi down'));
    const res = await post(buildApp('mentor'));
    expect(res.status).toBe(503);
  });

  it('mentor + cache miss → writes to cache after Strapi lookup', async () => {
    mockPerfil(true);
    await post(buildApp('mentor'));
    expect(redisMock.set).toHaveBeenCalledWith(
      'requireApproved:user-1',
      true,
      { ex: 60 },
    );
  });
});

describe('requireApproved — instituicao (flag ON)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFlagOn();
  });

  it('instituicao + estado verified → 201', async () => {
    mockInstituicao('verified');
    const res = await post(buildApp('instituicao'));
    expect(res.status).toBe(201);
  });

  it('instituicao + estado draft → 403 with PERFIL_NAO_APROVADO', async () => {
    mockInstituicao('draft');
    const res = await post(buildApp('instituicao'));
    expect(res.status).toBe(403);
    const body = await res.json() as { code: string };
    expect(body.code).toBe('PERFIL_NAO_APROVADO');
  });

  it('instituicao + Strapi unavailable → 503', async () => {
    redisMock.get.mockResolvedValue(null);
    strapiGetMock.mockRejectedValue(new Error('Strapi down'));
    const res = await post(buildApp('instituicao'));
    expect(res.status).toBe(503);
  });
});

describe('requireApproved — dependência da flag indisponível', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isEnabledMock.mockRejectedValue(new Error('Strapi down'));
  });

  it('bloqueia mentor em vez de permitir criação sem verificar aprovação', async () => {
    const res = await post(buildApp('mentor'));

    expect(res.status).toBe(503);
    expect(strapiGetMock).not.toHaveBeenCalled();
  });

  it('mantém o escopo institucional ao falhar e não consulta o perfil', async () => {
    const res = await post(buildApp('instituicao', 42));

    expect(res.status).toBe(503);
    expect(isEnabledMock).toHaveBeenCalledWith('APPROVAL_ENFORCEMENT_ENABLED', 42);
    expect(strapiGetMock).not.toHaveBeenCalled();
  });
});

describe('requireApproved — cache invalidation subscriber', () => {
  it('deletes cache key on PERFIL_APROVADO event', async () => {
    vi.clearAllMocks();
    const registerMock = vi.fn();
    const { eventBus } = await import('../modules/events/event-bus.js');
    vi.mocked(eventBus).register = registerMock;

    const { registerApprovalCacheInvalidator } = await import('./requireApproved.js');
    registerApprovalCacheInvalidator();

    const aprovadoCall = registerMock.mock.calls.find((call) => call[0] === 'perfil.aprovado');
    expect(aprovadoCall).toBeDefined();
    if (!aprovadoCall) throw new Error('aprovadoCall not found');
    const handler = aprovadoCall[1] as (event: { payload: Record<string, unknown> }) => Promise<void>;

    await handler({ payload: { userId: 'user-42' } } as never);
    expect(redisMock.del).toHaveBeenCalledWith('requireApproved:user-42');
  });

  it('deletes cache key on PERFIL_REJEITADO event', async () => {
    vi.clearAllMocks();
    const registerMock = vi.fn();
    const { eventBus } = await import('../modules/events/event-bus.js');
    vi.mocked(eventBus).register = registerMock;

    const { registerApprovalCacheInvalidator } = await import('./requireApproved.js');
    registerApprovalCacheInvalidator();

    const rejeitadoCall = registerMock.mock.calls.find((call) => call[0] === 'perfil.rejeitado');
    expect(rejeitadoCall).toBeDefined();
    if (!rejeitadoCall) throw new Error('rejeitadoCall not found');
    const handler = rejeitadoCall[1] as (event: { payload: Record<string, unknown> }) => Promise<void>;

    await handler({ payload: { userId: 'user-99' } } as never);
    expect(redisMock.del).toHaveBeenCalledWith('requireApproved:user-99');
  });
});
