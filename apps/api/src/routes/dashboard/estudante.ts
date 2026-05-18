import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../../modules/auth/auth.middleware.js';
import { checkRole } from '../../modules/auth/rbac.middleware.js';
import { strapiGet } from '../../modules/strapi/strapi.client.js';
import {
  type PerfilCompleto,
  type DashboardEstudante,
	  type PerfilVocacional,
	  type Vinculo,
	  type InscricaoComCurso,
  type StrapiListResponse,
	} from '@pdc/shared';
import { vocacionalService } from '../../modules/vocacional/vocacional.service.js';

type Vars = { Variables: AuthVariables };
export const dashboardEstudanteRoutes = new Hono<Vars>();

dashboardEstudanteRoutes.use('*', verifyJwt, checkRole(['estudante']));

/**
 * GET /dashboard/estudante
 * Dashboard analítico do estudante: KPIs, match, comportamento, cursos em progresso.
 * Substitui GET /estudante/dashboard (mantido para compat).
 */
dashboardEstudanteRoutes.get('/', async (c) => {
  const { id: userId } = c.get('user');

  const EMPTY_DASHBOARD: DashboardEstudante = {
    stats: { xp: 0, reputacao: 0, conquistasCount: 0, vinkulosCount: 0, pulseVariacao: null },
    match: {
      area: 'Tecnologia',
      score: 0,
      insight: 'Completa o teu perfil vocacional para descobrires as tuas áreas de maior afinidade.',
      directive: 'PERFIL PENDENTE',
    },
    behavior: null,
    progressoCursos: [],
    proximaAcao: { label: 'Completar Perfil', to: '/app/perfil-vocacional' },
    insightsTina: [],
  };

  try {
    const resPerfil = await strapiGet<PerfilCompleto>('/perfis', {
      'filters[userId][$eq]': userId,
      'populate': ['foto', 'conquistas', 'inscricoes.curso'],
    });

    const perfil = resPerfil.data[0];
    if (!perfil) return c.json(EMPTY_DASHBOARD);

    const perfilId = perfil.id;

    let vinculosRes: Pick<StrapiListResponse<Vinculo>, 'data'> = { data: [] };
    let vocacionalRes: Pick<StrapiListResponse<PerfilVocacional>, 'data'> = { data: [] };

    const settled = await Promise.allSettled([
      strapiGet<Vinculo>('/vinculos', {
        'filters[$or][0][solicitante][id][$eq]': perfilId,
        'filters[$or][1][destinatario][id][$eq]': perfilId,
        'filters[status][$eq]': 'aprovado',
      }),
      strapiGet<PerfilVocacional>('/perfil-vocacionais', {
        'filters[perfil][id][$eq]': perfilId,
        'sort': 'createdAt:desc',
        'pagination[pageSize]': '1',
      }),
    ]);

    if (settled[0].status === 'fulfilled') {
      vinculosRes = settled[0].value;
    } else {
      const reason: unknown = settled[0].reason;
      console.warn({ err: reason, userId, perfilId, op: 'fetch-vinculos' }, 'Falha ao obter vínculos');
    }

    if (settled[1].status === 'fulfilled') {
      vocacionalRes = settled[1].value;
    } else {
      const reason: unknown = settled[1].reason;
      console.warn({ err: reason, userId, perfilId, op: 'fetch-vocacional' }, 'Falha ao obter vocacional');
    }

	    const lastPattern = vocacionalRes.data[0];
	    const areaPrincipal = perfil.areaInteresse || 'Tecnologia';
    const inscricoes = perfil.inscricoes ?? [];

    let recomendacoes: { id: string }[] = [];
    try {
      const recs = await vocacionalService.gerarRecomendacoes(lastPattern || null);
      recomendacoes = recs.map((r) => ({ id: r.id }));
    } catch (err) {
      console.warn(
        { err, perfilId, route: 'dashboard/estudante', op: 'gerar-recomendacoes' },
        'Falha ao gerar recomendações',
      );
    }

    const dashboardData: DashboardEstudante = {
      stats: {
        xp: perfil.xp || 0,
        reputacao: perfil.reputacao || 0,
        conquistasCount: perfil.conquistas.length,
        vinkulosCount: vinculosRes.data.length,
        pulseVariacao: null,
      },
      match: {
        area: areaPrincipal,
        score: lastPattern?.scoreGlobal || 0,
        insight: lastPattern
          ? `A tua afinidade com ${areaPrincipal} continua a solidificar-se.`
          : 'Ainda sem dados. Completa uma simulação para obteres o teu match vocacional.',
        directive: lastPattern ? 'RECOMENDAÇÃO DE ALTA FIDELIDADE' : 'MATCH PENDENTE',
      },
      behavior: lastPattern
        ? {
            domainId: lastPattern.areaMatch,
            fluidez: lastPattern.dimensoes.fluidez,
            resiliencia: lastPattern.dimensoes.resiliencia,
            foco: lastPattern.dimensoes.foco,
          }
        : null,
      progressoCursos:
        inscricoes.map((i: InscricaoComCurso) => ({
          id: i.id,
          titulo: i.curso?.titulo || 'Curso',
          progresso: i.progressoPercentagem || 0,
        })),
      proximaAcao: {
        label: recomendacoes.length > 0 ? 'Continuar Simulação' : 'Iniciar Simulação',
        to: recomendacoes[0]?.id ? `/app/simulacao/${recomendacoes[0].id}` : '/app/simulacoes',
      },
      insightsTina: lastPattern
        ? [
            `A tua resiliência ao erro em ${areaPrincipal} está acima da média. Considera desafios mais complexos.`,
          ]
        : [],
    };

    return c.json(dashboardData);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    return c.json({ error: message }, 500);
  }
});
