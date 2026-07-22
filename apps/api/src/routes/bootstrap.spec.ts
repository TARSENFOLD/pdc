import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyAccessJwtMock = vi.hoisted(() => vi.fn());
const getUserByIdMock = vi.hoisted(() => vi.fn());

// Mocks devem ser os PRIMEIROS antes de importar a rota
vi.mock('../lib/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret-mock-safeguard',
    API_URL: 'http://localhost:3000',
    FRONTEND_URL: 'http://localhost:5173',
  },
}));

vi.mock('pino', () => ({
  default: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyAccessJwt: verifyAccessJwtMock,
}));

vi.mock('../modules/auth/auth.service.js', () => ({
  authService: { getUserById: getUserByIdMock },
}));

import { bootstrapRoutes } from './bootstrap.js';
import { featureFlagService } from '../modules/feature-flags/feature-flags.service.js';

interface BootstrapPayload {
  session: {
    status: 'authenticated' | 'anonymous' | 'unknown';
    isAuthenticated: boolean;
    user: unknown;
  };
  capabilities: {
    features: Record<string, boolean | undefined>;
  };
}

function assertBootstrapPayload(value: unknown): asserts value is BootstrapPayload {
  if (typeof value !== 'object' || value === null || !('session' in value) || !('capabilities' in value)) {
    throw new Error('Bootstrap payload inválido');
  }
}

vi.mock('../modules/feature-flags/feature-flags.service.js', () => ({
  featureFlagService: {
    getEffectiveFlags: vi.fn(),
  },
}));

describe('GET /bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyAccessJwtMock.mockResolvedValue(null);
    getUserByIdMock.mockResolvedValue({
      id: 'user-1',
      email: 'user@pdc.test',
      role: 'estudante',
      perfilId: 'perfil-1',
    });
  });

  it('deve retornar carga anonima baseada no registry canonico se nao autenticado', async () => {
    vi.mocked(featureFlagService.getEffectiveFlags).mockResolvedValueOnce({});
    
    const req = new Request('http://localhost/');
    const res = await bootstrapRoutes.request(req);
    
    expect(res.status).toBe(200);
    const json: unknown = await res.json();
    assertBootstrapPayload(json);
    
    expect(json.session.isAuthenticated).toBe(false);
    expect(json.session.status).toBe('anonymous');
    expect(json.session.user).toBeNull();
    // 'STABLE' default is true, 'BETA'/'ALPHA'/'ROLLOUT' = false, 'HIDDEN' = omitted
    expect(json.capabilities.features['DISCUSSIONS_ENABLED']).toBe(true);
    expect(json.capabilities.features['REPUTATION_VISIBLE']).toBe(false);
    // SIM_TIPO_2/3 promoted to STABLE (DT-15) — static default is ON; Strapi operator sets enabled=false in prod
    expect(json.capabilities.features['SIM_TIPO_2_PUBLISH_ENABLED']).toBe(true);
    expect(json.capabilities.features['SIM_TIPO_3_PUBLISH_ENABLED']).toBe(true);
    expect(json.capabilities.features['MENSAGENS_INBOX']).toBeUndefined(); // HIDDEN
  });

  it('deve priorizar overrides dinamicos do strapi mas NUNCA as HIDDEN', async () => {
    vi.mocked(featureFlagService.getEffectiveFlags).mockResolvedValueOnce({
      'REPUTATION_VISIBLE': true, // Strapi says ON
      'MENSAGENS_INBOX': true, // Strapi tentou activar um HIDDEN
    });
    
    const req = new Request('http://localhost/');
    const res = await bootstrapRoutes.request(req);
    
    expect(res.status).toBe(200);
    const json: unknown = await res.json();
    assertBootstrapPayload(json);
    
    expect(json.capabilities.features['REPUTATION_VISIBLE']).toBe(true); // Strapi ganha
    expect(json.capabilities.features['MENSAGENS_INBOX']).toBeUndefined(); // Registry barra HIDDEN
  });

  it('deve degradar para defaults estaticos quando overrides remotos falham', async (): Promise<void> => {
    vi.mocked(featureFlagService.getEffectiveFlags).mockRejectedValueOnce(
      new Error('Strapi indisponivel'),
    );

    const req = new Request('http://localhost/');
    const res = await bootstrapRoutes.request(req);

    expect(res.status).toBe(200);
    const json: unknown = await res.json();
    assertBootstrapPayload(json);

    expect(json.session.isAuthenticated).toBe(false);
    expect(json.capabilities.features['DISCUSSIONS_ENABLED']).toBe(true);
    expect(json.capabilities.features['REPUTATION_VISIBLE']).toBe(false);
    expect(json.capabilities.features['MENSAGENS_INBOX']).toBeUndefined();
  });

  it('devolve a sessão autenticada e resolve flags pela instituição do token', async () => {
    verifyAccessJwtMock.mockResolvedValueOnce({
      sub: 'user-1',
      role: 'estudante',
      instituicaoId: 42,
    });
    getUserByIdMock.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@pdc.test',
      role: 'estudante',
    });
    vi.mocked(featureFlagService.getEffectiveFlags).mockResolvedValueOnce({});

    const res = await bootstrapRoutes.request(new Request('http://localhost/', {
      headers: { Cookie: 'access_token=token-valido' },
    }));

    expect(res.status).toBe(200);
    const json: unknown = await res.json();
    assertBootstrapPayload(json);
    expect(json.session).toEqual({
      status: 'authenticated',
      isAuthenticated: true,
      user: { id: 'user-1', email: 'user@pdc.test', role: 'estudante' },
    });
    expect(featureFlagService.getEffectiveFlags).toHaveBeenCalledWith(42);
  });

  it('mantém capabilities públicas e marca a sessão como desconhecida quando o Redis falha', async () => {
    verifyAccessJwtMock.mockRejectedValueOnce(new Error('Redis unavailable'));
    vi.mocked(featureFlagService.getEffectiveFlags).mockResolvedValueOnce({});

    const req = new Request('http://localhost/', {
      headers: { Cookie: 'access_token=token-valido' },
    });
    const res = await bootstrapRoutes.request(req);

    expect(res.status).toBe(200);
    const json: unknown = await res.json();
    assertBootstrapPayload(json);
    expect(json.session).toEqual({ status: 'unknown', isAuthenticated: false, user: null });
    expect(json.capabilities.features['DISCUSSIONS_ENABLED']).toBe(true);
    expect(featureFlagService.getEffectiveFlags).toHaveBeenCalledWith(undefined);
  });

  it('não converte falha de enriquecimento Strapi numa sessão anónima', async () => {
    verifyAccessJwtMock.mockResolvedValueOnce({ sub: 'user-1', role: 'estudante' });
    getUserByIdMock.mockRejectedValueOnce(new Error('Strapi unavailable'));
    vi.mocked(featureFlagService.getEffectiveFlags).mockResolvedValueOnce({});

    const res = await bootstrapRoutes.request(new Request('http://localhost/', {
      headers: { Cookie: 'access_token=token-valido' },
    }));

    expect(res.status).toBe(200);
    const json: unknown = await res.json();
    assertBootstrapPayload(json);
    expect(json.session).toEqual({ status: 'unknown', isAuthenticated: false, user: null });
  });
});
