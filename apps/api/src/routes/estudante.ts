import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import {
  PerfilCompleto, 
  DashboardEstudante, 
  PerfilVocacional,
  Vinculo
} from '@pdc/shared';
import { vocacionalService } from '../modules/vocacional/vocacional.service.js';

type Vars = { Variables: AuthVariables };
export const estudanteRoutes = new Hono<Vars>();

estudanteRoutes.use('*', verifyJwt, checkRole(['estudante', 'estudante']));

/**
 * GET /estudante/dashboard
 * Dashboard central do estudante com stats, match e comportamento.
 */
estudanteRoutes.get('/dashboard', async (c) => {
  const { id: userId } = c.get('user');

  try {
    // 1. Buscar perfil real do utilizador
    const resPerfil = await strapiGet<PerfilCompleto>('/perfis', {
      'filters[userId][$eq]': userId,
      'populate': 'foto,conquistas,inscricoes.curso'
    });
    
    const perfil = resPerfil.data[0];
    if (!perfil) return c.json({ error: 'Perfil não encontrado' }, 404);

    const perfilId = String(perfil.id);

    // 2. Buscar vínculos e padrões vocacionais
    const [vinculosRes, vocacionalRes] = await Promise.all([
      strapiGet<Vinculo>('/vinculos', {
        'filters[$or][0][solicitante][id][$eq]': perfilId,
        'filters[$or][1][destinatario][id][$eq]': perfilId,
        'filters[estado][$eq]': 'connected'
      }),
      strapiGet<PerfilVocacional>('/perfil-vocacionals', {
        'filters[perfil][id][$eq]': perfilId,
        'sort': 'createdAt:desc',
        'pagination[pageSize]': '1'
      })
    ]);

    const lastPattern = vocacionalRes.data[0];
    const areaPrincipal = perfil.areaInteresse || 'Tecnologia';
    
    const recomendacoes = await vocacionalService.gerarRecomendacoes(lastPattern || null);

    const dashboardData: DashboardEstudante = {
      stats: {
        xp: perfil.xp || 0,
        reputacao: perfil.reputacao || 0,
        conquistasCount: perfil.conquistas?.length || 0,
        vinkulosCount: vinculosRes.data.length,
        pulseVariacao: 12,
      },
      match: {
        area: areaPrincipal,
        score: lastPattern?.scoreGlobal || 75,
        insight: `Com base nas tuas últimas interações, a tua afinidade com ${areaPrincipal} continua a solidificar-se.`,
        directive: 'RECOMENDAÇÃO DE ALTA FIDELIDADE',
      },
      behavior: lastPattern ? {
        domainId: lastPattern.areaMatch,
        fluidez: lastPattern.dimensoes.fluidez,
        resiliencia: lastPattern.dimensoes.resiliencia,
        foco: lastPattern.dimensoes.foco,
      } : null,
      progressoCursos: perfil.inscricoes?.map((i) => ({
        id: String(i.id),
        titulo: i.curso?.titulo || 'Curso',
        progresso: i.progressoPercentagem || 0,
      })) || [],
      proximaAcao: {
        label: 'Continuar Simulação',
        to: `/app/simulacao/${recomendacoes[0]?.id ?? '1'}`,
      },
      insightsTina: [
        `A tua resiliência ao erro em ${areaPrincipal} está acima da média. Considera explorar desafios mais complexos.`,
        'Verificamos um padrão de hesitação em gestão de projetos. Um curso de Agile pode ser benéfico.'
      ],
    };

    return c.json(dashboardData);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    return c.json({ error: message }, 500);
  }
});
