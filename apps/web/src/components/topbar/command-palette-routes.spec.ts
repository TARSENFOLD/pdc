import { describe, expect, it } from 'vitest';
import type { Role } from '@pdc/shared';
import { COMMAND_CONTENT_ROUTES, getNavCommands } from './command-palette-routes';

describe('command palette routes', () => {
  it('usa destinos de conteúdo canónicos', () => {
    expect(COMMAND_CONTENT_ROUTES.mentor('mentor-1')).toBe('/app/mentores/mentor-1');
    expect(COMMAND_CONTENT_ROUTES.instituicao('instituicao-1')).toBe('/app/instituicoes/instituicao-1');
    expect(COMMAND_CONTENT_ROUTES.perfil('perfil-1')).toBe('/app/perfil/perfil-1');
  });

  it.each([
    ['mentor', 'Criar Simulação', '/app/mentor/simulacoes/criar'],
    ['estudante', 'Certificados', '/app/certificados'],
    ['super_admin', 'LTI Plataformas', '/app/admin/lti'],
  ] satisfies Array<[Role, string, string]>)(
    'resolve o comando %s sem rota obsoleta',
    (role, label, expectedPath) => {
      expect(getNavCommands(role).find((command) => command.label === label)?.to).toBe(expectedPath);
    },
  );
});
