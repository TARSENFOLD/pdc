import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };
export const mentoriaRoutes = new Hono<Vars>();

mentoriaRoutes.use('*', verifyJwt);

interface StrapiMentoria {
  id: string;
  alunoId: string;
  alunoNome: string;
  alunoEmail: string;
  tipo: string;
  estado: string;
  createdAt: string;
}

// GET /mentorias/alunado
mentoriaRoutes.get('/alunado', async (c) => {
  const { id: mentorId } = c.get('user');
  try {
    const res = await strapiGet<StrapiMentoria>('/mentorias', {
      'filters[mentorId][$eq]': mentorId,
    });
    
    const mentorados = res.data.map((m) => ({
      id: m.id,
      alunoId: m.alunoId,
      alunoNome: m.alunoNome,
      alunoEmail: m.alunoEmail,
      mentoriaId: m.id,
      tipo: m.tipo,
      estado: m.estado,
      criadaEm: m.createdAt,
    }));

    return c.json({ data: mentorados });
  } catch (err) {
    return c.json({ error: 'Erro ao carregar mentorados' }, 502);
  }
});

// GET /mentorias/validar-projeto/:projetoId
mentoriaRoutes.get('/validar-projeto/:projetoId', async (c) => {
  const projetoId = c.req.param('projetoId');
  const { id: mentorId } = c.get('user');

  try {
    const res = await strapiGet<any>(`/projetos/${projetoId}`);
    const proj = res.data[0];
    
    if (!proj) return c.json({ error: 'Projeto não encontrado' }, 404);
    
    // Logica de verificação de permissão do mentor sobre o aluno do projeto
    const resVinculo = await strapiGet<any>('/vinculos', {
      'filters[senderId][$eq]': proj.alunoId,
      'filters[receiverId][$eq]': mentorId,
      'filters[estado][$eq]': 'connected',
    });

    if (resVinculo.data.length === 0) {
      return c.json({ error: 'Não tens vínculo com o autor deste projeto' }, 403);
    }

    return c.json({ data: proj });
  } catch (err) {
    return c.json({ error: 'Erro ao validar projeto' }, 500);
  }
});
