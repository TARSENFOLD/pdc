import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { CriarCursoPayloadSchema } from '@pdc/shared';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import pino from 'pino';

const log = pino({ name: 'cursos-routes' });

type Vars = { Variables: AuthVariables };

interface Curso {
  id: string | number;
  titulo: string;
  autorId: string;
  estado: 'draft' | 'review' | 'published' | 'archived';
  categoria?: string;
}

// ── Route Schemas ───────────────────────────────────────────────────────────

const cursoQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  categoria: z.string().optional(),
  autorId: z.string().optional(),
});

export const cursoRoutes = new Hono<Vars>();

cursoRoutes.use('*', verifyJwt);

// GET /cursos
cursoRoutes.get('/', zValidator('query', cursoQuerySchema), async (c) => {
  const q = c.req.valid('query');
  const user = c.get('user');
  
  const params: Record<string, string | string[]> = { populate: 'capa,autor' };
  if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
  if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
  if (q.search !== undefined) params['filters[titulo][$containsi]'] = q.search;
  
  // Apenas cursos publicados no catálogo público
  params['filters[estado][$eq]'] = 'published';

  try {
    // 1. Buscar cursos publicados
    const res = await strapiGet<Curso>('/cursos', params as any);
    
    // 2. Lógica Soberana de Match (End-to-End)
    // Se for aluno, filtramos por mérito behaviorista
    if (user.role === 'aluno') {
      const patternsRes = await strapiGet<any>('/behavior-patterns', {
        'filters[perfil][userId][$eq]': user.id,
      });
      const pattern = patternsRes.data[0];

      // Enriquecer os cursos com metadados de bloqueio
      const enrichedData = res.data.map((curso: any) => {
        const regras = curso.regrasAcesso;
        let bloqueado = false;
        let motivo = '';

        if (regras && pattern) {
          if (regras.minFluidez && pattern.cognitiveFluidity < regras.minFluidez) {
            bloqueado = true;
            motivo = 'Fluidez insuficiente';
          }
          if (regras.minResiliencia && pattern.resilienceIndex < regras.minResiliencia) {
            bloqueado = true;
            motivo = 'Resiliência insuficiente';
          }
        }

        return { ...curso, bloqueado, motivoBloqueio: motivo };
      });

      return c.json({ ...res, data: enrichedData });
    }

    return c.json(res);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /cursos/meus — cursos criados pelo mentor/instituição
cursoRoutes.get('/meus', checkRole(['mentor', 'instituicao', 'super_admin']), async (c) => {
  const { id } = c.get('user');
  const page = c.req.query('page') || '1';

  try {
      const res = await strapiGet<Curso>('/cursos', {
        'filters[autorId][$eq]': id,
        populate: 'capa',
        'pagination[page]': page,
      });
      return c.json({
        data: res.data,
        pagination: res.meta.pagination
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro interno';
      return c.json({ error: message }, 502);
    }
});

// GET /cursos/me/inscricoes — deve vir antes de /:id
cursoRoutes.get('/me/inscricoes', async (c) => {
  const { id } = c.get('user');
  try {
    const res = await strapiGet<any>('/inscricoes', {
      'filters[alunoId][$eq]': id,
      populate: 'curso.capa',
    });
    return c.json(res);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /cursos/:id
cursoRoutes.get('/:id', async (c) => {
  const cursoId = c.req.param('id');
  try {
    const res = await strapiGet<Curso>(`/cursos/${cursoId}`, {
      populate: 'capa,autor,modulos.itens',
    });
    
    const data = res.data[0];
    if (!data) return c.json({ error: 'Curso não encontrado' }, 404);

    // Se não for o autor nem moderador/admin, e não estiver publicado, 403
    const user = c.get('user');
    if (data.estado !== 'published' && data.autorId !== user.id && !['moderador', 'super_admin'].includes(user.role)) {
      return c.json({ error: 'Acesso negado' }, 403);
    }

    return c.json(res);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// POST /cursos — criar curso completo (E2E Soberano)
cursoRoutes.post('/', checkRole(['mentor', 'instituicao', 'super_admin']), zValidator('json', CriarCursoPayloadSchema), async (c) => {
  const payload = c.req.valid('json');
  const { id: autorId } = c.get('user');
  const { modulos, ...cursoData } = payload;
  
  try {
    // 1. Criar o Curso Base no Strapi
    const res = await strapiPost<Curso>('/cursos', {
      ...cursoData,
      autorId,
      estado: 'published', // No patamar mundial, materialização é imediata se vindo do builder
      slug: payload.titulo.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
    });
    
    const cursoId = res.data.id;

    // 2. Criar Módulos e Itens em Cascata (Sovereign Cascading)
    if (modulos && modulos.length > 0) {
      for (const mod of modulos) {
        const modRes = await strapiPost<any>('/modulos', {
          titulo: mod.titulo,
          ordem: mod.ordem,
          curso: cursoId
        });
        
        const moduloId = modRes.data.id;
        
        for (const item of mod.itens) {
          await strapiPost('/modulo-items', {
            ...item,
            modulo: moduloId
          });
        }
      }
    }

    // 3. CAMADA 5: IMPACTO NO ECOSSISTEMA
    // Disparar evento para o Event Bus. O impacto (Feed, Match, Conquista) é autônomo.
    await eventBus.publishWithOutbox(DomainEventName.CURSO_PUBLICADO, {
      cursoId,
      autorId,
      titulo: cursoData.titulo,
      area: cursoData.area,
      regrasAcesso: cursoData.regrasAcesso
    });

    log.info({ cursoId, autorId }, 'Curso materializado com sucesso e impacto disparado.');
    
    return c.json(res, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno na materialização';
    log.error({ err, autorId }, 'Falha crítica na Camada 3/5 de Cursos');
    return c.json({ error: message }, 502);
  }
});

// PUT /cursos/:id — editar curso
cursoRoutes.put('/:id', checkRole(['mentor', 'instituicao', 'super_admin']), zValidator('json', CriarCursoPayloadSchema.partial()), async (c) => {
  const id = c.req.param('id');
  const payload = c.req.valid('json');
  const user = c.get('user');

  try {
    // Verificar se é o autor
    const resGet = await strapiGet<Curso>(`/cursos/${id}`);
    const curso = resGet.data[0];
    if (!curso) return c.json({ error: 'Curso não encontrado' }, 404);

    if (curso.autorId !== user.id && !['moderador', 'super_admin'].includes(user.role)) {
      return c.json({ error: 'Não tem permissão para editar este curso' }, 403);
    }

    const resPut = await strapiPut<Curso>(`/cursos/${id}`, payload);
    return c.json(resPut);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// PATCH /cursos/:id/estado — transição de estado editorial
cursoRoutes.patch('/:id/estado', checkRole(['mentor', 'instituicao', 'moderador', 'super_admin']), zValidator('json', z.object({
  estado: z.enum(['review', 'published', 'archived']),
})), async (c) => {
  const id = c.req.param('id');
  const { estado } = c.req.valid('json');
  const user = c.get('user');

  try {
    // Buscar curso actual
    const resGet = await strapiGet<Curso>(`/cursos/${id}`);
    const curso = resGet.data[0];
    if (!curso) return c.json({ error: 'Curso não encontrado' }, 404);

    const estadoActual = curso.estado;

    // Validar transições permitidas
    const transicaoPermitida = (actual: string, novo: string, role: string): boolean => {
      if (role === 'super_admin') return true;
      if (role === 'moderador') return novo === 'archived' && actual === 'published';
      if (['mentor', 'instituicao'].includes(role)) {
        if (actual === 'draft' && novo === 'review') return true;
        if (actual === 'approved' && novo === 'published') return true;
      }
      return false;
    };

    // Verificar autorização
    const podeEditar = user.id === curso.autorId || ['moderador', 'super_admin'].includes(user.role);
    if (!podeEditar) {
      return c.json({ error: 'Sem permissão para editar este curso' }, 403);
    }

    if (!transicaoPermitida(estadoActual, estado, user.role)) {
      return c.json({
        error: `Transição inválida de ${estadoActual} para ${estado}`
      }, 400);
    }

    // Actualizar estado
    await strapiPut<unknown>(`/cursos/${id}`, { estado });

    return c.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// POST /cursos/:id/inscricao — aluno apenas
cursoRoutes.post('/:id/inscricao', checkRole(['aluno']), async (c) => {
  const cursoId = c.req.param('id');
  const { id: alunoId } = c.get('user');
  try {
    const res = await strapiPost<unknown>('/inscricoes', {
      cursoId,
      alunoId,
      dataInscricao: new Date().toISOString(),
      concluido: false,
      progressoPercentagem: 0,
    });
    return c.json(res, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});
