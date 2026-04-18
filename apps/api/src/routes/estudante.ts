import { Hono } from 'hono';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';

type Vars = { Variables: AuthVariables };
export const estudanteRoutes = new Hono<Vars>();

estudanteRoutes.use('*', verifyJwt);

/**
 * GET /estudante/dashboard
 * Agregador Soberano para o Centro de Comando Cognitivo.
 */
estudanteRoutes.get('/dashboard', async (c) => {
  try {
    // 1. Buscar Perfil (para XP e Reputação)
    const perfil = await strapiGet<{ data: any }>('/perfis/me');
    const perfilId = perfil.data.id;

    // 2. Buscar Heurísticas Recentes (Músculo)
    const behavior = await strapiGet<{ data: any[] }>('/behavior-patterns', {
      'filters[perfil][id][$eq]': perfilId,
      'sort': 'lastUpdatedAt:desc',
      'pagination[limit]': '1'
    });

    // 3. Buscar Inscrições em Curso (Progresso)
    const inscricoes = await strapiGet<{ data: any[] }>('/inscricoes', {
      'filters[perfil][id][$eq]': perfilId,
      'populate': 'curso',
      'pagination[limit]': '5'
    });

    // 4. Buscar Conquistas Recentes
    const conquistas = await strapiGet<{ data: any[] }>('/conquista-utilizadors', {
      'filters[perfil][id][$eq]': perfilId,
      'populate': 'conquista',
      'sort': 'createdAt:desc',
      'pagination[limit]': '3'
    });

    return c.json({
      stats: {
        xp: perfil.data.xp || 0,
        reputacao: perfil.data.reputacao || 0,
        conquistasCount: conquistas.data.length
      },
      behavior: behavior.data[0] || null,
      progressoCursos: inscricoes.data.map(i => ({
        id: i.id,
        curso: i.curso.titulo,
        percentagem: i.progressoPercentual || 0
      })),
      nextAction: {
        tipo: 'simulation',
        label: 'Continuar Diagnóstico de Engenharia',
        to: '/app/simulacoes/engenharia-civil'
      }
    });
  } catch (err) {
    return c.json({ error: 'Erro ao consolidar dashboard' }, 502);
  }
});

estudanteRoutes.get('/certificados', async (c) => {
  const { id: userId } = c.get('user');
  const data = await strapiGet<unknown>('/certificados', {
    'filters[perfil][userId][$eq]': userId,
    populate: 'curso',
  });
  return c.json(data);
});

estudanteRoutes.get('/ranking', async (c) => {
  const data = await strapiGet<Record<string, unknown>>('/perfis', {
    'filters[tipo][$eq]': 'aluno',
    sort: 'xp:desc',
    'pagination[limit]': '10',
  });
  return c.json(data);
});
