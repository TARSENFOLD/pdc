import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../../modules/auth/auth.middleware.js';
import { checkRole } from '../../modules/auth/rbac.middleware.js';
import { strapiGet } from '../../modules/strapi/strapi.client.js';
import type { BehaviorPattern, MentorDashboard, StrapiListResponse } from '@pdc/shared';

type Vars = { Variables: AuthVariables };

interface StrapiMentoria {
  id: string | number;
  estudanteId: string;
  estudanteNome: string;
  estudanteEmail?: string;
  estado: string;
}

export const dashboardMentorRoutes = new Hono<Vars>();

dashboardMentorRoutes.use('*', verifyJwt, checkRole(['mentor', 'super_admin']));

dashboardMentorRoutes.get('/', async (c) => {
  const { id: mentorId } = c.get('user');

  try {
    const mentorias = await strapiGet<StrapiMentoria>('/mentorias', {
      'filters[mentorId][$eq]': mentorId,
      'filters[estado][$ne]': 'recusada',
      'pagination[pageSize]': '100',
    });

    const patterns = await fetchMentoradoPatterns(mentorias.data);
    const meritoMedio = average(patterns.map((p) => p.technicalScore));
    const fluidezMedia = average(patterns.map((p) => p.cognitiveFluidity));

    const dashboard: MentorDashboard = {
      stats: {
        totalTalentos: mentorias.data.length,
        meritoMedio,
        fluidezMedia,
      },
      patterns,
    };

    return c.json(dashboard);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

async function fetchMentoradoPatterns(
  mentorias: Array<StrapiMentoria & { id: string | number }>,
): Promise<MentorDashboard['patterns']> {
  const settled = await Promise.allSettled(
    mentorias.map(async (mentoria) => {
      const res: StrapiListResponse<BehaviorPattern> = await strapiGet<BehaviorPattern>('/behavior-patterns', {
        'filters[perfil][$eq]': mentoria.estudanteId,
        'sort': 'lastUpdatedAt:desc',
        'pagination[pageSize]': '1',
      });
      const pattern = res.data[0];
      if (!pattern) return null;
      return {
        perfil: {
          id: mentoria.estudanteId,
          nome: mentoria.estudanteNome,
        },
        cognitiveFluidity: pattern.cognitiveFluidity,
        resilienceIndex: pattern.resilienceIndex,
        hesitationIndex: pattern.hesitationIndex,
        technicalScore: pattern.technicalScore,
        lastUpdatedAt: pattern.lastUpdatedAt,
      };
    }),
  );

  return settled.flatMap((result) => {
    if (result.status === 'rejected' || result.value === null) return [];
    return [result.value];
  });
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}
