import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import {
  type PerfilCompleto,
  type DashboardEstudante,
  type PerfilVocacional,
  type Vinculo,
  type StrapiListResponse,
} from '@pdc/shared';
import { vocacionalService } from '../modules/vocacional/vocacional.service.js';
import { requireCertificatesEnabled } from '../modules/feature-flags/cor-0001-gates.js';

type Vars = { Variables: AuthVariables };
export const estudanteRoutes = new Hono<Vars>();

estudanteRoutes.use('*', verifyJwt, checkRole(['estudante']));

/**
 * GET /estudante/certificados
 * Retorna inscrições concluídas com dados do curso (para a página de certificados).
 */
estudanteRoutes.get('/certificados', requireCertificatesEnabled(), async (c) => {
  const { id: userId } = c.get('user');

  try {
    const resPerfil = await strapiGet<{ id: string | number }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
    });

    const perfil = resPerfil.data[0];
    if (!perfil) return c.json({ data: [] });

    const resInscricoes = await strapiGet<{
      id: string;
      cursoId?: string;
      dataInscricao: string;
      concluido: boolean;
      dataConclusao?: string;
      progressoPercentagem: number;
      curso?: { titulo?: string };
    }>('/inscricoes', {
      'filters[estudante][id][$eq]': String(perfil.id),
      'filters[concluido][$eq]': 'true',
      'populate': 'curso',
      'sort': 'dataConclusao:desc',
    });

    return c.json({ data: resInscricoes.data });
  } catch {
    return c.json({ data: [] });
  }
});

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
      'populate': ['foto', 'conquistas', 'inscricoes.curso']
    });
    
    const perfil = resPerfil.data[0];
    
    // Fallback gracioso: estudante sem perfil ainda vê dashboard aspiracional
    if (!perfil) {
      const dashboardData: DashboardEstudante = {
        stats: { xp: 0, reputacao: 0, conquistasCount: 0, vinkulosCount: 0, pulseVariacao: null },
        match: { area: 'Tecnologia', score: 0, insight: 'Completa o teu perfil vocacional para descobrires as tuas áreas de maior afinidade.', directive: 'PERFIL PENDENTE' },
        behavior: null,
        progressoCursos: [],
        proximaAcao: { label: 'Completar Perfil', to: '/app/perfil-vocacional' },
        insightsTina: ['Bem-vindo à plataforma. O teu percurso começa com o preenchimento do perfil vocacional.'],
      };
      return c.json(dashboardData);
    }

    const perfilId = perfil.id;

    // 2. Buscar vínculos e padrões vocacionais (com fallback para arrays vazios)
    let vinculosRes: Pick<StrapiListResponse<Vinculo>, 'data'> = { data: [] };
    let vocacionalRes: Pick<StrapiListResponse<PerfilVocacional>, 'data'> = { data: [] };
    
    try {
      [vinculosRes, vocacionalRes] = await Promise.all([
        strapiGet<Vinculo>('/vinculos', {
          'filters[$or][0][solicitante][id][$eq]': perfilId,
          'filters[$or][1][destinatario][id][$eq]': perfilId,
          'filters[status][$eq]': 'aprovado'
        }),
        strapiGet<PerfilVocacional>('/perfil-vocacionais', {
          'filters[perfil][id][$eq]': perfilId,
          'filters[atual][$eq]': 'true',
          'sort': 'createdAt:desc',
          'pagination[pageSize]': '1'
        })
      ]);
    } catch (err) {
      console.warn({ err, userId, perfilId, route: 'estudante', op: 'fetch-vinculos-vocacional' }, 'Falha ao obter vínculos/vocacional - usando fallback');
      // Fallback silencioso: telemetria vazia não bloqueia dashboard
      vinculosRes = { data: [] };
      vocacionalRes = { data: [] };
    }

    const lastPattern = vocacionalRes.data[0];
    const areaPrincipal = perfil.areaInteresse || 'Tecnologia';
    const inscricoes = perfil.inscricoes ?? [];
    
    // Recomendações com tratamento seguro
    let recomendacoes: { id: string }[] = [];
    try {
      const recs = await vocacionalService.gerarRecomendacoes(lastPattern || null);
      recomendacoes = recs.map(r => ({ id: r.id }));
    } catch (err) {
      console.warn({ err, perfilId, route: 'estudante', op: 'gerar-recomendacoes' }, 'Falha ao gerar recomendações - usando fallback vazio');
      recomendacoes = [];
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
          ? `Com base nas tuas últimas interações, a tua afinidade com ${areaPrincipal} continua a solidificar-se.`
          : 'Ainda sem dados suficientes. Completa uma simulação para obteres o teu match vocacional.',
        directive: lastPattern ? 'RECOMENDAÇÃO DE ALTA FIDELIDADE' : 'MATCH PENDENTE',
      },
      behavior: lastPattern ? {
        domainId: lastPattern.areaMatch,
        fluidez: lastPattern.dimensoes.fluidez,
        resiliencia: lastPattern.dimensoes.resiliencia,
        foco: lastPattern.dimensoes.foco,
      } : null,
      progressoCursos: inscricoes.map((i) => ({
        id: i.id,
        titulo: i.curso?.titulo || 'Curso',
        progresso: i.progressoPercentagem || 0,
      })),
      proximaAcao: {
        label: recomendacoes.length > 0 ? 'Continuar Simulação' : 'Iniciar Simulação',
        to: recomendacoes[0]?.id ? `/app/simulacao/${recomendacoes[0].id}` : '/app/simulacoes',
      },
      insightsTina: lastPattern ? [
        `A tua resiliência ao erro em ${areaPrincipal} está acima da média. Considera explorar desafios mais complexos.`,
        'Verificamos um padrão de hesitação em gestão de projetos. Um curso de Agile pode ser benéfico.'
      ] : ['Completa o teu perfil vocacional para receberes insights personalizados do Oráculo.'],
    };

    return c.json(dashboardData);
  } catch (error: unknown) {
    // Erro 5xx real (ex: Strapi down) - retorna erro para UI mostrar tela de retry
    const message = error instanceof Error ? error.message : 'Erro interno';
    return c.json({ error: message }, 500);
  }
});
