import { Hono } from 'hono';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import type { PerfilCompleto, Inscricao,Conquista } from '@pdc/shared';

type Vars = { Variables: AuthVariables };
export const estudanteRoutes = new Hono<Vars>();

estudanteRoutes.use('*', verifyJwt);

/**
 * GET /estudante/dashboard
 * Agregador Soberano para o Centro de Comando Cognitivo.
 */
estudanteRoutes.get('/dashboard', async (c) => {
  try {
    const { id: userId } = c.get('user');

    // 1. Buscar Perfil Soberano
    const resPerfil = await strapiGet<PerfilCompleto>('/perfis', {
      'filters[userId][$eq]': userId,
    });
    const perfil = resPerfil.data[0];
    if (!perfil) return c.json({ error: 'Perfil não encontrado' }, 404);
    const perfilId = perfil.id.toString();

    // 2. Buscar Heurísticas Recentes (Músculo: phi e R)
    const behaviorRes = await strapiGet<any>('/behavior-patterns', { // TODO: Criar BehaviorPattern no shared
      'filters[perfil][id][$eq]': perfilId,
      'sort': 'lastUpdatedAt:desc',
      'pagination[limit]': '1'
    });

    // 3. Buscar Inscrições em Curso (Progresso)
    const inscricoes = await strapiGet<Inscricao & { curso: { titulo: string } }>('/inscricoes', {
      'filters[perfil][id][$eq]': perfilId,
      'populate': 'curso',
      'pagination[limit]': '5'
    });

    // 4. Buscar Conquistas (Count real)
    const conquistas = await strapiGet<Conquista>('/conquista-utilizadors', {
      'filters[perfil][id][$eq]': perfilId,
      'pagination[limit]': '1'
    });

    return c.json({
      stats: {
        xp: perfil.xp || 0,
        reputacao: perfil.reputacao || 0,
        conquistasCount: conquistas.meta.pagination.total || 0
      },
      behavior: behaviorRes.data[0] || null,
      progressoCursos: inscricoes.data.map((i: any) => ({
        id: i.id,
        curso: i.curso?.titulo || 'Curso sem título',
        percentagem: i.progressoPercentual || 0
      })),
      nextAction: {
        tipo: 'simulation',
        label: 'Continuar Diagnóstico Vocacional',
        to: '/app/simulacoes'
      }
    });
  } catch (err) {
    console.error('[DASHBOARD_ERROR]', err);
    return c.json({ error: 'Erro ao consolidar o Centro de Comando' }, 502);
  }
});

estudanteRoutes.get('/certificados', async (c) => {
  const { id: userId } = c.get('user');
  const res = await strapiGet<any>('/certificados', {
    'filters[perfil][userId][$eq]': userId,
    populate: 'curso',
  });
  return c.json(res);
});

estudanteRoutes.get('/ranking', async (c) => {
  const res = await strapiGet<any>('/perfis', {
    'filters[tipo][$eq]': 'aluno',
    sort: 'xp:desc',
    'pagination[limit]': '10',
  });
  return c.json(res);
});
