import { describe, expect, it } from 'vitest';
import { BootstrapResponseSchema } from './bootstrap';
import { Features } from './registry/features';

describe('BootstrapResponseSchema', () => {
  it('deve validar um payload autêntico e íntegro com 4 camadas', () => {
    const payload = {
      session: {
        isAuthenticated: true,
        user: {
          id: 'usr_xyz123',
          email: 'aluno@teste.ao',
          role: 'aluno',
          perfilId: 'prf_abc456',
        },
      },
      capabilities: {
        features: {
          'DISCUSSIONS_ENABLED': true,
          'REPUTATION_VISIBLE': false,
        },
        roles: ['aluno', 'mentor', 'instituicao', 'moderador', 'comite_cientifico', 'super_admin'],
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

  it('deve validar o registry de funcionalidades sem erros', () => {
    expect(Features).toHaveProperty('DISCUSSIONS_ENABLED');
    expect(Features).toHaveProperty('MENSAGENS_INBOX');
  });
});
