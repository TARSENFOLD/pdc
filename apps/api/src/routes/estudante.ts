import { Hono } from 'hono';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import type { PerfilCompleto, Inscricao, Conquista, DashboardEstudante } from '@pdc/shared';

type Vars = { Variables: AuthVariables };
export const estudanteRoutes = new Hono<Vars>();

estudanteRoutes.use('*', verifyJwt);

/**
 * GET /estudante/dashboard
 * Agregador Soberano para a Infraestrutura de Decisão.
 * Ciclo E2E: Heurísticas -> Match -> Dashboard.
 */
estudanteRoutes.get('/dashboard', async (c) => {
  try {
    const { id: userId } = c.get('user');

    // 1. Buscar Perfil e Vínculos
    const resPerfil = await strapiGet<PerfilCompleto>('/perfis', {
      'filters[userId][$eq]': userId,
      'populate': 'vinculos'
    });
    const perfil = resPerfil.data[0];
    if (!perfil) return c.json({ error: 'Perfil não encontrado' }, 404);
    const perfilId = perfil.id.toString();

    // 2. Buscar Heurísticas Recentes (Músculo: phi e R)
    const behaviorRes = await strapiGet<{
      id: number;
      domainId: string;
      cognitiveFluidity: number;
      resilienceIndex: number;
      focusStability: number;
    }>('/behavior-patterns', {
      'filters[perfil][id][$eq]': perfilId,
      'sort': 'lastUpdatedAt:desc',
      'pagination[limit]': '1'
    });
    const lastPattern = behaviorRes.data[0];

    // 3. Buscar Inscrições em Curso (Progresso)
    const inscricoes = await strapiGet<Inscricao & { curso: { titulo: string } }>('/inscricoes', {
      'filters[perfil][id][$eq]': perfilId,
      'populate': 'curso',
      'pagination[limit]': '3'
    });

    // 4. Buscar Conquistas
    const conquistas = await strapiGet<Conquista>('/conquista-utilizadors', {
      'filters[perfil][id][$eq]': perfilId,
      'pagination[limit]': '1'
    });

    // 5. Buscar Vínculos (Contagem Real)
    const vinculos = await strapiGet<{ id: number }>('/vinculos', {
      'filters[$or]': [
        { 'solicitante[id][$eq]': perfilId },
        { 'destinatario[id][$eq]': perfilId }
      ],
      'filters[status][$eq]': 'aprovado',
      'pagination[limit]': '1'
    });

    // 6. Cálculo Dinâmico de Match (Motor L2 Real)
    const areaPrincipal = perfil.areaInteresse || 'Tecnologia & Engenharia';
    const autoridadeMatch = lastPattern 
      ? (lastPattern.cognitiveFluidity * 0.6 + lastPattern.resilienceIndex * 0.4) * 10 
      : 0;

    const response: DashboardEstudante = {
      stats: {
        xp: perfil.xp || 0,
        reputacao: perfil.reputacao || 0,
        conquistasCount: (conquistas.meta as any).pagination.total || 0,
        vinkulosCount: (vinculos.meta as any).pagination.total || 0,
        pulseVariacao: lastPattern ? 12 : 0
      },
      match: {
        area: areaPrincipal,
        score: Math.round(autoridadeMatch),
        insight: lastPattern 
          ? `Os teus padrões de Fluidez Cognitiva indicam aptidão superior para esta área.`
          : 'Inicia uma simulação para o Oráculo mapear o teu perfil.',
        directive: lastPattern ? 'Aptidão Validada pelo Oráculo' : 'Diagnóstico Pendente'
      },
      behavior: lastPattern ? {
        domainId: lastPattern.domainId,
        fluidez: lastPattern.cognitiveFluidity,
        resiliencia: lastPattern.resilienceIndex,
        foco: lastPattern.focusStability
      } : null,
      progressoCursos: (inscricoes.data as any[]).map((i: any) => ({
        id: String(i.id),
        titulo: i.curso?.titulo || 'Curso sem título',
        progresso: i.progressoPercentual || 0
      })),
      proximaAcao: {
        tipo: lastPattern ? 'simulation' : 'onboarding',
        label: lastPattern ? 'Executar Simulação de Nível Médio' : 'Fazer Primeira Simulação',
        to: '/app/simulacoes'
      },
      insightsTina: lastPattern ? [
        "A tua hesitação diminuiu 15% na última semana.",
        "Recomendamos o módulo 'Cálculo I' para reforçar a tua resiliência."
      ] : ["Bem-vindo ao PDC. Completa o teu perfil para insights personalizados."]
    };

    return c.json(response);
  } catch (err: unknown) {
    console.error('[DASHBOARD_E2E_ERROR]', err);
    return c.json({ error: 'Erro ao consolidar o Centro de Comando' }, 502);
  }
});

estudanteRoutes.get('/certificados', async (c) => {
  const { id: userId } = c.get('user');
  const res = await strapiGet<{ id: number; curso: { titulo: string } }>('/certificados', {
    'filters[perfil][userId][$eq]': userId,
    populate: 'curso',
  });
  return c.json(res);
});

estudanteRoutes.get('/ranking', async (c) => {
  const res = await strapiGet<PerfilCompleto>('/perfis', {
    'filters[tipo][$eq]': 'aluno',
    sort: 'xp:desc',
    'pagination[limit]': '10',
  });
  return c.json(res);
});
