import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { requireAdult } from '../modules/auth/minor.guard.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };
export const mentoriaRoutes = new Hono<Vars>();

mentoriaRoutes.use('*', verifyJwt);

interface StrapiMentoria {
  id: string;
  estudanteId: string;
  estudanteNome: string;
  estudanteEmail: string;
  tipo: string;
  estado: string;
  createdAt: string;
}

// GET /mentorias/alunado
mentoriaRoutes.get('/alunado', requireAdult(), async (c) => {
  const { id: mentorId } = c.get('user');
  try {
    const res = await strapiGet<StrapiMentoria>('/mentorias', {
      'filters[mentorId][$eq]': mentorId,
    });
    
    const mentorados = res.data.map((m) => ({
      id: m.id,
      estudanteId: m.estudanteId,
      estudanteNome: m.estudanteNome,
      estudanteEmail: m.estudanteEmail,
      mentoriaId: m.id,
      tipo: m.tipo,
      estado: m.estado,
      criadaEm: m.createdAt,
    }));

    return c.json({ data: mentorados });
  } catch {
    return c.json({ error: 'Erro ao carregar mentorados' }, 502);
  }
});

interface StrapiProjeto {
  id: string | number;
  titulo: string;
  estudanteId: string;
}

// GET /mentorias/validar-projeto/:projetoId
mentoriaRoutes.get('/validar-projeto/:projetoId', requireAdult(), async (c) => {
  const projetoId = c.req.param('projetoId');
  const { id: mentorId } = c.get('user');

  try {
    const res = await strapiGet<StrapiProjeto>(`/projetos/${projetoId}`);
    const proj = res.data[0];
    
    if (!proj) return c.json({ error: 'Projeto não encontrado' }, 404);
    
    // Logica de verificação de permissão do mentor sobre o estudante do projeto
    const resVinculo = await strapiGet<unknown>('/vinculos', {
      'filters[senderId][$eq]': proj.estudanteId,
      'filters[receiverId][$eq]': mentorId,
      'filters[estado][$eq]': 'connected',
    });

    if (resVinculo.data.length === 0) {
      return c.json({ error: 'Não tens vínculo com o autor deste projeto' }, 403);
    }

    return c.json({ data: proj });
  } catch {
    return c.json({ error: 'Erro ao validar projeto' }, 500);
  }
});
