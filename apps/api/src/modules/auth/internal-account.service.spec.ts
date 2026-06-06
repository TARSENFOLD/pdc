import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setCanonicalUserRole } from './internal-account.service.js';
import {
  strapiGet,
  strapiGetRaw,
  strapiPost,
  strapiPut,
} from '../strapi/strapi.client.js';

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiGetRaw: vi.fn(),
  strapiPost: vi.fn(),
  strapiPut: vi.fn(),
  strapiPutRaw: vi.fn(),
}));

interface PerfilFixture {
  id: string;
  tipo?: string;
}

describe('internal-account.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(strapiGetRaw).mockResolvedValue({
      id: 'user-1',
      email: 'operador@pdc.ao',
      username: 'operador@pdc.ao',
    });
  });

  it('atualiza perfil.tipo, que é a fonte canónica usada no login', async () => {
    vi.mocked(strapiGet<PerfilFixture>).mockResolvedValue({
      data: [{ id: 'perfil-1', tipo: 'estudante' }],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
    });
    vi.mocked(strapiPut).mockResolvedValue({
      data: { id: 'perfil-1' },
      meta: {},
    });

    const result = await setCanonicalUserRole('user-1', 'moderador');

    expect(strapiPut).toHaveBeenCalledWith('/perfis/perfil-1', {
      tipo: 'moderador',
      funcao: 'Moderação',
    });
    expect(result).toEqual({
      perfilId: 'perfil-1',
      oldRole: 'estudante',
      newRole: 'moderador',
    });
  });

  it('cria perfil interno mínimo quando o utilizador ainda não possui perfil', async () => {
    vi.mocked(strapiGet<PerfilFixture>).mockResolvedValue({
      data: [],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 0, total: 0 } },
    });
    vi.mocked(strapiPost).mockResolvedValue({
      data: { id: 'perfil-new' },
      meta: {},
    });

    const result = await setCanonicalUserRole('user-1', 'comite_cientifico');

    expect(strapiPost).toHaveBeenCalledWith('/perfis', {
      userId: 'user-1',
      nome: 'operador@pdc.ao',
      email: 'operador@pdc.ao',
      tipo: 'comite_cientifico',
      funcao: 'Validação Científica',
      ativo: true,
      aprovado: true,
      onboardingCompleto: true,
    });
    expect(result.newRole).toBe('comite_cientifico');
  });
});
