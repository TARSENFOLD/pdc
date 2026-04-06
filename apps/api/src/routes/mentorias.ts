import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };

const solicitarSchema = z.object({
  mentorId: z.string().min(1),
  mensagem: z.string().min(10).max(500),
  tipo: z.enum(['orientacao_vocacional', 'acompanhamento_curso', 'revisao_projeto']).default('orientacao_vocacional'),
  preco: z.number().min(0).default(0),
  cursoId: z.string().optional(),
  projetoId: z.string().optional(),
});

const recusarSchema = z.object({
  motivo: z.string().max(300).optional(),
});

export const mentoriaRoutes = new Hono<Vars>();

mentoriaRoutes.use('*', verifyJwt);

// GET /mentorias/stats — dashboard mentor stats
mentoriaRoutes.get('/stats', checkRole(['mentor']), async (c) => {
  const { id } = c.get('user');
  try {
    const [activas, orientados, pendentes] = await Promise.all([
      strapiGet<{ meta?: { pagination?: { total?: number } } }>('/mentorias', {
        'filters[mentorId][$eq]': id,
        'filters[estado][$eq]': 'aceite',
        'pagination[pageSize]': '1',
      }),
      strapiGet<{ meta?: { pagination?: { total?: number } } }>('/mentorias', {
        'filters[mentorId][$eq]': id,
        'filters[estado][$in][0]': 'aceite',
        'filters[estado][$in][1]': 'concluida',
        'pagination[pageSize]': '1',
      }),
      strapiGet<{ meta?: { pagination?: { total?: number } } }>('/mentorias', {
        'filters[mentorId][$eq]': id,
        'filters[estado][$eq]': 'pendente',
        'pagination[pageSize]': '1',
      }),
    ]);
    return c.json({
      mentoriasActivas: activas?.meta?.pagination?.total ?? 0,
      alunosOrientados: orientados?.meta?.pagination?.total ?? 0,
      avaliacoesPendentes: pendentes?.meta?.pagination?.total ?? 0,
    });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// GET /mentorias/mentorados — lista alunos em mentoria activa
mentoriaRoutes.get('/mentorados', checkRole(['mentor', 'super_admin']), async (c) => {
  const { id } = c.get('user');
  try {
    interface StrapiMentoria {
      id: string;
      alunoId: string;
      aluno?: { nome?: string; email?: string };
      tipo: string;
      estado: string;
      createdAt: string;
    }
    const data = await strapiGet<{ data: StrapiMentoria[] }>('/mentorias', {
      'filters[mentorId][$eq]': id,
      'filters[estado][$eq]': 'aceite',
      populate: 'aluno',
    });

    const mentorados = data.data.map((m: StrapiMentoria) => ({
      id: m.id,
      alunoId: m.alunoId,
      alunoNome: m.aluno?.nome ?? 'Desconhecido',
      alunoEmail: m.aluno?.email ?? 'N/A',
      mentoriaId: m.id,
      tipo: m.tipo,
      estado: m.estado,
      criadaEm: m.createdAt,
    }));

    return c.json(mentorados);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// GET /mentorias/alunos/inscritos — alunos inscritos nos cursos do mentor
mentoriaRoutes.get('/alunos/inscritos', checkRole(['mentor', 'super_admin']), async (c) => {
  const { id } = c.get('user');
  const page = c.req.query('page') || '1';
  
  try {
    // Busca inscrições onde o curso.autorId é o mentor autenticado
    const data = await strapiGet<unknown>('/inscricoes', {
      'filters[curso][autorId][$eq]': id,
      populate: 'aluno,curso',
      'pagination[page]': page,
    });
    
    return c.json(data);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// GET /mentorias — filtrado por role
mentoriaRoutes.get('/', async (c) => {
  const { id, role } = c.get('user');
  const params: Record<string, string> = { populate: 'aluno,mentor', 'sort': 'createdAt:desc' };
  if (role === 'aluno') {
    params['filters[alunoId][$eq]'] = id;
  } else if (role === 'mentor') {
    params['filters[mentorId][$eq]'] = id;
  }
  // moderadores e admins vêem tudo
  try {
    return c.json(await strapiGet<unknown>('/mentorias', params));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// POST /mentorias — aluno solicita
mentoriaRoutes.post(
  '/',
  checkRole(['aluno']),
  zValidator('json', solicitarSchema),
  async (c) => {
    const { id: alunoId } = c.get('user');
    const { mentorId, mensagem, tipo, preco, cursoId, projetoId } = c.req.valid('json');

    // Validação contextual por tipo
    if (tipo === 'acompanhamento_curso') {
      if (!cursoId) return c.json({ error: 'cursoId obrigatório para acompanhamento de curso' }, 400);
      const inscricao = await strapiGet<{ data: unknown[] }>('/inscricoes', {
        'filters[alunoId][$eq]': alunoId,
        'filters[cursoId][$eq]': cursoId,
        'pagination[pageSize]': '1',
      });
      if (!inscricao.data?.length) return c.json({ error: 'Não estás inscrito neste curso' }, 400);
    }

    if (tipo === 'revisao_projeto') {
      if (!projetoId) return c.json({ error: 'projetoId obrigatório para revisão de projecto' }, 400);
      const proj = await strapiGet<{ data: { alunoId?: string } }>(`/projetos/${projetoId}`);
      if (proj.data?.alunoId !== alunoId) return c.json({ error: 'Este projecto não te pertence' }, 403);
    }

    const comissaoPDC = preco > 0 ? Math.round(preco * 0.20 * 100) / 100 : 0;

    try {
      return c.json(
        await strapiPost<unknown>('/mentorias', {
          alunoId,
          mentorId,
          mensagem,
          tipo,
          preco,
          comissaoPDC,
          estado: 'pendente',
          ...(cursoId ? { cursoId } : {}),
          ...(projetoId ? { projetoId } : {}),
        }),
        201
      );
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);

// PUT /mentorias/:id/aceitar — mentor
mentoriaRoutes.put('/:id/aceitar', checkRole(['mentor']), async (c) => {
  const id = c.req.param('id');
  try {
    return c.json(await strapiPut<unknown>(`/mentorias/${id ?? ''}`, { estado: 'aceite' }));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// PUT /mentorias/:id/recusar — mentor
mentoriaRoutes.put(
  '/:id/recusar',
  checkRole(['mentor']),
  zValidator('json', recusarSchema),
  async (c) => {
    const id = c.req.param('id');
    const { motivo } = c.req.valid('json');
    try {
      const payload: Record<string, string> = { estado: 'recusada' };
      if (motivo !== undefined) payload['motivo'] = motivo;
      return c.json(await strapiPut<unknown>(`/mentorias/${id}`, payload));
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);

// PUT /mentorias/:id/concluir — aluno ou mentor
mentoriaRoutes.put('/:id/concluir', async (c) => {
  const id = c.req.param('id');
  try {
    return c.json(await strapiPut<unknown>(`/mentorias/${id}`, { estado: 'concluida' }));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});
