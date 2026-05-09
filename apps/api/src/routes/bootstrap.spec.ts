import { describe, expect, it, vi } from 'vitest';

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
    warn: vi.fn(),
  })),
}));

import { bootstrapRoutes } from './bootstrap.js';
import { featureFlagService } from '../modules/feature-flags/feature-flags.service.js';

interface BootstrapPayload {
  session: {
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

vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jose')>();
  return {
    ...actual,
    jwtVerify: vi.fn(),
  };
});

describe('GET /bootstrap', () => {
  it('deve retornar carga anonima baseada no registry canonico se nao autenticado', async () => {
    vi.mocked(featureFlagService.getEffectiveFlags).mockResolvedValueOnce({});
    
    const req = new Request('http://localhost/');
    const res = await bootstrapRoutes.request(req);
    
    expect(res.status).toBe(200);
    const json: unknown = await res.json();
    assertBootstrapPayload(json);
    
    expect(json.session.isAuthenticated).toBe(false);
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
});
