import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet, strapiPost, strapiPutRaw } from '../modules/strapi/strapi.client.js';
import * as featureFlagService from '../modules/feature-flags/feature-flags.service.js';

type Vars = { Variables: AuthVariables };
export const discussionRoutes = new Hono<Vars>();

// ── Schemas ─────────────────────────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const createThreadSchema = z.object({
  titulo: z.string().min(1).max(300),
  corpo: z.string().min(1).max(10000),
  cursoId: z.coerce.number().int().positive(),
});

const replySchema = z.object({
  texto: z.string().min(1).max(5000),
  paiId: z.coerce.number().int().positive().optional(),
});

const pinSchema = z.object({ pinned: z.boolean() });
const resolveSchema = z.object({ resolved: z.boolean() });

// ── Helpers ─────────────────────────────────────────────────────────────────

const MAX_REPLY_DEPTH = 3;

interface StrapiCountMeta { meta: { pagination: { total: number } } }

async function isEnrolled(userId: string, cursoId: number | string): Promise<boolean> {
  try {
    const res = await strapiGet<StrapiCountMeta>('/inscricoes', {
      'pagination[pageSize]': '1',
      'filters[user][$eq]': userId,
      'filters[curso][$eq]': String(cursoId),
    });
    return (res.meta?.pagination?.total ?? 0) > 0;
  } catch {
    return false;
  }
}

async function isMentorOrAdmin(userId: string, cursoId: number | string): Promise<boolean> {
  try {
    const curso = await strapiGet<{ data: { autorId?: string } }>(`/cursos/${String(cursoId)}`, {
      'fields[0]': 'autorId',
    });
    if (curso.data?.autorId === userId) return true;
  } catch { /* fall through */ }
  return false;
}

async function getReplyDepth(paiId: number): Promise<number> {
  let depth = 1;
  let currentId: number | null = paiId;
  while (currentId && depth < MAX_REPLY_DEPTH + 1) {
    try {
      const res: { data: { pai?: { id: number } } } = await strapiGet<{ data: { pai?: { id: number } } }>(
        `/respostas-discussao/${String(currentId)}`,
        { 'populate': 'pai' },
      );
      currentId = res.data?.pai?.id ?? null;
      if (currentId) depth++;
    } catch {
      break;
    }
  }
  return depth;
}

async function isDiscussionsEnabled(): Promise<boolean> {
  try {
    const flags = await featureFlagService.getEffectiveFlags();
    return !!flags['DISCUSSIONS_ENABLED'];
  } catch {
    return false;
  }
}

// ── Feature flag middleware ──────────────────────────────────────────────────

discussionRoutes.use('*', async (c, next) => {
  if (!(await isDiscussionsEnabled())) {
    return c.json({ error: 'Discussions desactivadas' }, 403);
  }
  await next();
});

// ── GET /discussions/course/:cursoId — listar threads (paginado) ────────────

discussionRoutes.get(
  '/course/:cursoId',
  verifyJwt,
  zValidator('query', paginationSchema),
  async (c) => {
    const cursoId = c.req.param('cursoId');
    const user = c.get('user');
    const { page, limit } = c.req.valid('query');

    if (!(await isEnrolled(user.id, cursoId))) {
      return c.json({ error: 'Tens de estar inscrito no curso para ver discussões' }, 403);
    }

    const res = await strapiGet<{ data: unknown[]; meta: unknown }>('/discussoes', {
      'filters[curso][id][$eq]': cursoId,
      'sort[0]': 'pinned:desc',
      'sort[1]': 'createdAt:desc',
      'pagination[page]': String(page),
      'pagination[pageSize]': String(limit),
      'populate': 'curso',
    });

    return c.json({ data: res.data, meta: res.meta });
  },
);

// ── POST /discussions — criar thread (requer inscrição) ─────────────────────

discussionRoutes.post(
  '/',
  verifyJwt,
  zValidator('json', createThreadSchema),
  async (c) => {
    const user = c.get('user');
    const { titulo, corpo, cursoId } = c.req.valid('json');

    if (!(await isEnrolled(user.id, cursoId))) {
      return c.json({ error: 'Tens de estar inscrito no curso para criar discussões' }, 403);
    }

    const res = await strapiPost<{ data: unknown }>('/discussoes', {
      titulo,
      corpo,
      curso: cursoId,
      autorId: user.id,
    });

    return c.json({ data: res.data }, 201);
  },
);

// ── GET /discussions/:id/replies — listar respostas ─────────────────────────

discussionRoutes.get(
  '/:id/replies',
  zValidator('query', paginationSchema),
  async (c) => {
    const id = c.req.param('id');
    const { page, limit } = c.req.valid('query');

    const res = await strapiGet<{ data: unknown[]; meta: unknown }>('/respostas-discussao', {
      'filters[discussao][id][$eq]': id,
      'sort': 'createdAt:asc',
      'populate': 'pai',
      'pagination[page]': String(page),
      'pagination[pageSize]': String(limit),
    });

    return c.json({ data: res.data, meta: res.meta });
  },
);

// ── POST /discussions/:id/replies — responder (requer inscrição) ────────────

discussionRoutes.post(
  '/:id/replies',
  verifyJwt,
  zValidator('json', replySchema),
  async (c) => {
    const discussaoId = c.req.param('id');
    const user = c.get('user');
    const { texto, paiId } = c.req.valid('json');

    // Get the discussion to find the course
    const discussion = await strapiGet<{ data: { curso?: { id: number } } }>(
      `/discussoes/${discussaoId}`,
      { 'populate': 'curso' },
    );
    const cursoId = discussion.data?.curso?.id;
    if (!cursoId) return c.json({ error: 'Discussão não encontrada' }, 404);

    if (!(await isEnrolled(user.id, cursoId))) {
      return c.json({ error: 'Tens de estar inscrito no curso para responder' }, 403);
    }

    // Depth limit check
    if (paiId) {
      const depth = await getReplyDepth(paiId);
      if (depth >= MAX_REPLY_DEPTH) {
        return c.json({ error: `Profundidade máxima de ${MAX_REPLY_DEPTH} níveis atingida` }, 400);
      }
    }

    const res = await strapiPost<{ data: unknown }>('/respostas-discussao', {
      texto,
      discussao: Number(discussaoId),
      autorId: user.id,
      ...(paiId ? { pai: paiId } : {}),
    });

    return c.json({ data: res.data }, 201);
  },
);

// ── PUT /discussions/:id/pin — pin/unpin (mentor/admin only) ────────────────

discussionRoutes.put(
  '/:id/pin',
  verifyJwt,
  zValidator('json', pinSchema),
  async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    const { pinned } = c.req.valid('json');

    // Get discussion to find the course
    const discussion = await strapiGet<{ data: { curso?: { id: number }; documentId?: string } }>(
      `/discussoes/${id}`,
      { 'populate': 'curso' },
    );
    const cursoId = discussion.data?.curso?.id;
    if (!cursoId) return c.json({ error: 'Discussão não encontrada' }, 404);

    const isAdmin = user.role === 'super_admin';
    if (!isAdmin && !(await isMentorOrAdmin(user.id, cursoId))) {
      return c.json({ error: 'Apenas o mentor do curso ou admin pode fixar discussões' }, 403);
    }

    const docId = discussion.data?.documentId ?? id;
    await strapiPutRaw(`/discussoes/${docId}`, { data: { pinned } });
    return c.json({ success: true });
  },
);

// ── PUT /discussions/:id/resolve — marcar resolvido (mentor/admin only) ─────

discussionRoutes.put(
  '/:id/resolve',
  verifyJwt,
  zValidator('json', resolveSchema),
  async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    const { resolved } = c.req.valid('json');

    const discussion = await strapiGet<{ data: { curso?: { id: number }; documentId?: string } }>(
      `/discussoes/${id}`,
      { 'populate': 'curso' },
    );
    const cursoId = discussion.data?.curso?.id;
    if (!cursoId) return c.json({ error: 'Discussão não encontrada' }, 404);

    const isAdmin = user.role === 'super_admin';
    if (!isAdmin && !(await isMentorOrAdmin(user.id, cursoId))) {
      return c.json({ error: 'Apenas o mentor do curso ou admin pode resolver discussões' }, 403);
    }

    const docId = discussion.data?.documentId ?? id;
    await strapiPutRaw(`/discussoes/${docId}`, { data: { resolved } });
    return c.json({ success: true });
  },
);
