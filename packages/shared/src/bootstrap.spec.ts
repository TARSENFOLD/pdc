import { describe, expect, it } from 'vitest';
import { BootstrapResponseSchema } from './bootstrap.js';
import { Features } from './registry/features.js';

describe('BootstrapResponseSchema', () => {
  it('deve validar um payload autêntico e íntegro com 4 camadas', () => {
    const payload = {
      session: {
        status: 'authenticated',
        isAuthenticated: true,
        user: {
          id: 'usr_xyz123',
          email: 'estudante@teste.ao',
          role: 'estudante',
          perfilId: 'prf_abc456',
        },
      },
      capabilities: {
        features: {
          'DISCUSSIONS_ENABLED': true,
          'REPUTATION_VISIBLE': false,
        },
        roles: ['estudante', 'mentor', 'instituicao', 'moderador', 'comite_cientifico', 'super_admin'],
      },
      security: {
        telemetryToken: 'ey...', // Mock token
      },
      ux: {
        theme: 'claro',
      },
    };

    const result = BootstrapResponseSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('distingue sessão anónima de sessão temporariamente desconhecida', () => {
    const common = {
      capabilities: { features: {}, roles: [] },
      security: {},
      ux: { theme: 'claro' },
    };

    expect(BootstrapResponseSchema.safeParse({
      ...common,
      session: { status: 'anonymous', isAuthenticated: false, user: null },
    }).success).toBe(true);
    expect(BootstrapResponseSchema.safeParse({
      ...common,
      session: { status: 'unknown', isAuthenticated: false, user: null },
    }).success).toBe(true);
    expect(BootstrapResponseSchema.safeParse({
      ...common,
      session: { status: 'unknown', isAuthenticated: true, user: null },
    }).success).toBe(false);
  });

  it('deve validar o registry de funcionalidades sem erros', () => {
    expect(Features).toHaveProperty('DISCUSSIONS_ENABLED');
    expect(Features).toHaveProperty('MENSAGENS_INBOX');
  });
});
