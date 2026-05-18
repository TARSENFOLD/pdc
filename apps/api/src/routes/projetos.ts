import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, optionalJwt, type OptionalAuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { requireApproved } from '../middleware/requireApproved.js';
import { rateLimitContentCreate } from '../middleware/rateLimit.js';
import { strapiGet, strapiPost, strapiPut, strapiDelete } from '../modules/strapi/strapi.client.js';
import { CriarProjetoPayloadSchema, GerirACLSchema, VotoProjetoPayloadSchema, TransicaoEstadoPayloadSchema, type Projeto, type ACLEntry, type Voto, type HistoricoEstado } from '@pdc/shared';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { toPaginatedResponse } from './pagination.js';

type Vars = { Variables: OptionalAuthVariables };
export const projetoRoutes = new Hono<Vars>();

const projetoQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  estado: z.string().optional(),
  area: z.string().optional(),
  modos: z.string().optional(),
});

interface StrapiProjeto extends Omit<Projeto, 'autor'> {
  autor?: { id: string | number; userId: string };
  acessoCoreACL?: ACLEntry[];
}

type OptionalUser = NonNullable<OptionalAuthVariables['user']>;

function filterCoreField(projeto: StrapiProjeto, perfilId: string | null): Partial<StrapiProjeto> {
  const isAutor = perfilId !== null && String(projeto.autor?.id) === perfilId;
  const hasApprovedAccess = perfilId && projeto.acessoCoreACL?.some(
    (entry) => entry.perfilId === perfilId && entry.estado === 'aprovado'
  );

  if (isAutor || hasApprovedAccess) {
    return projeto;
  }

  const { core, ...publicData } = projeto;
  void core;
  return publicData;
}

function firstProjeto(data: StrapiProjeto[] | StrapiProjeto): StrapiProjeto | null {
  return Array.isArray(data) ? data[0] ?? null : data;
}

function canModerateProjetos(user: OptionalUser | undefined): boolean {
  return user?.role === 'moderador' || user?.role === 'super_admin';
}

function canViewProjeto(projeto: StrapiProjeto, perfilId: string | null, user: OptionalUser | undefined): boolean {
  const isOwner = perfilId !== null && String(projeto.autor?.id) === perfilId;
  if (isOwner || canModerateProjetos(user)) return true;
  return projeto.estado === 'published' && projeto.visibilidade !== 'privado';
}

async function resolvePerfilId(userId: string | undefined): Promise<string | null> {
  if (!userId) return null;
  const resPerfil = await strapiGet<{ id: string }>('/perfis', {
    'filters[userId][$eq]': userId,
    'fields[0]': 'id',
  });
  return resPerfil.data[0]?.id || null;
}

// GET /projetos — público, core filtrado por ACL
projetoRoutes.get('/', optionalJwt, zValidator('query', projetoQuerySchema), async (c) => {
  try {
    const q = c.req.valid('query');
    const user = c.get('user');
    const perfilId = await resolvePerfilId(user?.id);
    const canModerate = canModerateProjetos(user);

    const params: Record<string, string> = {
      populate: 'autor,media',
      sort: 'createdAt:desc',
    };
    if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
    if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
    if (q.estado && canModerate) {
      params['filters[estado][$eq]'] = q.estado;
    } else {
      params['filters[estado][$eq]'] = 'published';
    }
    if (!canModerate) params['filters[visibilidade][$eq]'] = 'publico';
    if (q.area) params['filters[area][$eq]'] = q.area;
    if (q.modos) params['filters[modos][$containsi]'] = q.modos;

    const res = await strapiGet<StrapiProjeto>('/projetos', params);

    const filteredData = res.data.map(p => filterCoreField(p, perfilId));
    return c.json(toPaginatedResponse({ ...res, data: filteredData }));
  } catch {
    return c.json({ error: 'Falha ao sincronizar o ecossistema de projetos' }, 502);
  }
});

// GET /projetos/meus — requer autenticação
projetoRoutes.get('/meus', verifyJwt, async (c) => {
  const userId = c.get('user').id;
  try {
    const perfilId = await resolvePerfilId(userId);
    if (!perfilId) return c.json({ error: 'Identidade não localizada' }, 404);

    const res = await strapiGet<StrapiProjeto>('/projetos', {
      'filters[autor][id][$eq]': perfilId,
      populate: 'media',
    });
    return c.json(toPaginatedResponse(res));
  } catch {
    return c.json({ error: 'Erro ao recuperar os teus ativos' }, 502);
  }
});

// GET /projetos/:id — público, core filtrado por ACL
projetoRoutes.get('/:id', optionalJwt, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Projeto não encontrado' }, 404);
  try {
    const user = c.get('user');
    const perfilId = await resolvePerfilId(user?.id);

    const res = await strapiGet<StrapiProjeto>(`/projetos/${id}`, {
      populate: 'autor,media',
    });

    const project = firstProjeto(res.data);
    if (!project) return c.json({ error: 'Projeto não encontrado' }, 404);
    if (!canViewProjeto(project, perfilId, user)) return c.json({ error: 'Projeto não encontrado' }, 404);

    return c.json({ data: [filterCoreField(project, perfilId)] });
  } catch {
    return c.json({ error: 'Erro ao carregar projeto' }, 502);
  }
});

// POST /projetos — estudante, mentor, instituição, super_admin
projetoRoutes.post('/',
  verifyJwt,
  checkRole(['estudante', 'mentor', 'instituicao', 'super_admin']),
  requireApproved(),
  rateLimitContentCreate,
  zValidator('json', CriarProjetoPayloadSchema),
  async (c) => {
    const body = c.req.valid('json');
    const userId = c.get('user').id;

    try {
      const perfilId = await resolvePerfilId(userId);
      if (!perfilId) return c.json({ error: 'Identidade não localizada' }, 404);

      const slug = `${body.titulo.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')}-${Math.random().toString(36).substring(2, 7)}`;

      const now = new Date().toISOString();
      const historicoEstados: HistoricoEstado[] = [
        { estado: 'draft', timestamp: now, autorId: perfilId },
      ];

      const res = await strapiPost<StrapiProjeto>('/projetos', {
        ...body,
        autor: perfilId,
        estado: 'draft',
        slug,
        acessoCoreACL: [],
        votos: [],
        historicoEstados,
      });

      const projetoId = res.data.id;

      const event = await eventBus.publishWithOutbox(DomainEventName.PROJETO_CRIADO, {
        projetoId,
        autorId: perfilId,
        titulo: body.titulo,
        area: body.area,
      });

      return c.json({ ...res.data, eventId: event.id }, 201);
    } catch {
      return c.json({ error: 'Falha na publicação do projeto' }, 502);
    }
  }
);

// PUT /projetos/:id — apenas o autor pode editar
projetoRoutes.put('/:id',
  verifyJwt,
  zValidator('json', CriarProjetoPayloadSchema),
  async (c) => {
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'Projeto não encontrado' }, 404);
    const body = c.req.valid('json');
    const userId = c.get('user').id;

    try {
      const perfilId = await resolvePerfilId(userId);
      if (!perfilId) return c.json({ error: 'Identidade não localizada' }, 404);

      const resGet = await strapiGet<StrapiProjeto>(`/projetos/${id}`, { populate: 'autor' });
      const project = firstProjeto(resGet.data);
      if (!project) return c.json({ error: 'Projeto não encontrado' }, 404);

      if (project.autor?.userId !== userId) {
        return c.json({ error: 'Apenas o autor pode editar o projeto' }, 403);
      }

      const res = await strapiPut<StrapiProjeto>(`/projetos/${id}`, body);
      return c.json(res.data);
    } catch {
      return c.json({ error: 'Erro ao atualizar projeto' }, 502);
    }
  }
);

// POST /projetos/:id/solicitar-acesso — requer autenticação
projetoRoutes.post('/:id/solicitar-acesso', verifyJwt, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Projeto não encontrado' }, 404);
  const userId = c.get('user').id;

  try {
    const perfilId = await resolvePerfilId(userId);
    if (!perfilId) return c.json({ error: 'Identidade não localizada' }, 404);

    const resGet = await strapiGet<StrapiProjeto>(`/projetos/${id}`, { populate: 'autor' });
    const project = firstProjeto(resGet.data);
    if (!project) return c.json({ error: 'Projeto não encontrado' }, 404);

    const acl = project.acessoCoreACL ?? [];
    if (acl.some(entry => entry.perfilId === perfilId)) {
      return c.json({ error: 'Pedido já existe ou acesso já concedido' }, 400);
    }

    const autorId = project.autor?.id;
    if (!autorId) {
      return c.json({ error: 'Autor do projeto não identificado' }, 502);
    }

    const newEntry: ACLEntry = {
      perfilId,
      estado: 'pendente',
      solicitadoEm: new Date().toISOString(),
    };

    await strapiPut(`/projetos/${id}`, { acessoCoreACL: [...acl, newEntry] });

    await eventBus.publishWithOutbox(DomainEventName.PROJETO_ACESSO_SOLICITADO, {
      projetoId: id,
      autorId: perfilId,
      targetId: autorId,
    });

    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Erro ao solicitar acesso' }, 502);
  }
});

// PATCH /projetos/:id/acl — apenas o autor pode gerir
projetoRoutes.patch('/:id/acl',
  verifyJwt,
  zValidator('json', GerirACLSchema),
  async (c) => {
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'Projeto não encontrado' }, 404);
    const { perfilId, acao } = c.req.valid('json');
    const userId = c.get('user').id;

    try {
      const resGet = await strapiGet<StrapiProjeto>(`/projetos/${id}`, { populate: 'autor' });
      const project = firstProjeto(resGet.data);
      if (!project) return c.json({ error: 'Projeto não encontrado' }, 404);

      if (project.autor?.userId !== userId) {
        return c.json({ error: 'Apenas o autor pode gerir o acesso ao Core' }, 403);
      }

      const acl = project.acessoCoreACL ?? [];
      const entryIdx = acl.findIndex(e => e.perfilId === perfilId);
      if (entryIdx === -1) return c.json({ error: 'Solicitação não encontrada' }, 404);

      const entry = acl[entryIdx];
      if (!entry) return c.json({ error: 'Erro interno' }, 500);

      const autorId = String(project.autor.id);
      if (!autorId) {
        return c.json({ error: 'Autor do projeto não identificado' }, 502);
      }

      entry.estado = acao === 'aprovar' ? 'aprovado' : 'rejeitado';
      entry.respondidoEm = new Date().toISOString();

      await strapiPut(`/projetos/${id}`, { acessoCoreACL: acl });

      await eventBus.publishWithOutbox(
        acao === 'aprovar' ? DomainEventName.PROJETO_ACESSO_CONCEDIDO : DomainEventName.PROJETO_ACESSO_RECUSADO,
        {
          projetoId: id,
          autorId,
          targetId: perfilId,
        }
      );

      return c.json({ success: true });
    } catch {
      return c.json({ error: 'Erro ao gerir ACL' }, 502);
    }
  }
);

// GET /projetos/:id/votos — contagens públicas + estado do utilizador autenticado
projetoRoutes.get('/:id/votos', optionalJwt, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Projeto não encontrado' }, 404);
  const userId = c.get('user')?.id;

  try {
    const resGet = await strapiGet<StrapiProjeto>(`/projetos/${id}`, {});
    const project = firstProjeto(resGet.data);
    if (!project) return c.json({ error: 'Projeto não encontrado' }, 404);

    const votos: Voto[] = project.votos ?? [];
    const perfilId = await resolvePerfilId(userId);

    return c.json({
      endorsements: votos.filter(v => v.tipo === 'endorsement').length,
      votos_count: votos.filter(v => v.tipo === 'voto').length,
      endorsed: perfilId ? votos.some(v => v.perfilId === perfilId && v.tipo === 'endorsement') : false,
      voted: perfilId ? votos.some(v => v.perfilId === perfilId && v.tipo === 'voto') : false,
    });
  } catch {
    return c.json({ error: 'Erro ao carregar votos' }, 502);
  }
});

// POST /projetos/:id/votos — votar ou endorsar (não pode ser o próprio autor)
projetoRoutes.post('/:id/votos',
  verifyJwt,
  zValidator('json', VotoProjetoPayloadSchema),
  async (c) => {
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'Projeto não encontrado' }, 404);
    const { tipo, comentario } = c.req.valid('json');
    const userId = c.get('user').id;

    try {
      const perfilId = await resolvePerfilId(userId);
      if (!perfilId) return c.json({ error: 'Perfil não encontrado' }, 404);

      const resGet = await strapiGet<StrapiProjeto>(`/projetos/${id}`, { populate: 'autor' });
      const project = firstProjeto(resGet.data);
      if (!project) return c.json({ error: 'Projeto não encontrado' }, 404);

      if (project.autor?.userId === userId) {
        return c.json({ error: 'Não podes votar no teu próprio projeto' }, 403);
      }

      const votos: Voto[] = project.votos ?? [];
      if (votos.some(v => v.perfilId === perfilId && v.tipo === tipo)) {
        return c.json({ count: votos.filter(v => v.tipo === tipo).length, voted: true });
      }

      const novoVoto: Voto = { perfilId, tipo, comentario, criadoEm: new Date().toISOString() };
      votos.push(novoVoto);
      await strapiPut(`/projetos/${id}`, { votos });

      if (tipo === 'endorsement') {
        const targetId = project.autor?.id;
        if (targetId === undefined) {
          return c.json({ error: 'Autor do projeto não identificado' }, 502);
        }

        await eventBus.publishWithOutbox(DomainEventName.PROJETO_ENDORSEMENT_RECEBIDO, {
          projetoId: id,
          autorId: perfilId,
          targetId: String(targetId),
        });
      }

      return c.json({ count: votos.filter(v => v.tipo === tipo).length, voted: true });
    } catch {
      return c.json({ error: 'Erro ao registar voto' }, 502);
    }
  }
);

// DELETE /projetos/:id/votos?tipo=endorsement|voto — retirar voto
projetoRoutes.delete('/:id/votos', verifyJwt, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Projeto não encontrado' }, 404);
  const tipo = c.req.query('tipo') as 'endorsement' | 'voto' | undefined;
  if (tipo !== 'endorsement' && tipo !== 'voto') {
    return c.json({ error: 'Parâmetro tipo deve ser endorsement ou voto' }, 400);
  }
  const userId = c.get('user').id;

  try {
    const perfilId = await resolvePerfilId(userId);
    if (!perfilId) return c.json({ error: 'Perfil não encontrado' }, 404);

    const resGet = await strapiGet<StrapiProjeto>(`/projetos/${id}`, {});
    const project = firstProjeto(resGet.data);
    if (!project) return c.json({ error: 'Projeto não encontrado' }, 404);

    const votos: Voto[] = project.votos ?? [];
    const newVotos = votos.filter(v => !(v.perfilId === perfilId && v.tipo === tipo));

    if (newVotos.length < votos.length) {
      await strapiPut(`/projetos/${id}`, { votos: newVotos });
    }

    return c.json({ count: newVotos.filter(v => v.tipo === tipo).length, voted: false });
  } catch {
    return c.json({ error: 'Erro ao retirar voto' }, 502);
  }
});

// DELETE /projetos/:id — autor, moderador ou super_admin
projetoRoutes.delete('/:id', verifyJwt, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Projeto não identificado' }, 404);
  const userId = c.get('user').id;
  const userRole = c.get('user').role;

  try {
    const resGet = await strapiGet<StrapiProjeto>(`/projetos/${id}`, { populate: 'autor' });
    const existing = firstProjeto(resGet.data);

    if (!existing) return c.json({ error: 'Projeto não identificado' }, 404);

    const isAutor = existing.autor?.userId === userId;
    const isModerador = ['moderador', 'super_admin'].includes(userRole);

    if (!isAutor && !isModerador) {
      return c.json({ error: 'Autoridade insuficiente' }, 403);
    }

    await strapiDelete(`/projetos/${id}`);
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Falha na eliminação do ativo' }, 502);
  }
});

// PATCH /projetos/:id/estado — transição de estado com RBAC e historico
const TRANSICOES_AUTOR: Record<string, string[]> = {
  draft: ['review'],
  approved: ['published', 'archived'],
};
const TRANSICOES_MODERADOR: Record<string, string[]> = {
  review: ['approved', 'draft'],
  approved: ['published', 'hidden'],
  hidden: ['approved'],
};

projetoRoutes.patch('/:id/estado',
  verifyJwt,
  zValidator('json', TransicaoEstadoPayloadSchema),
  async (c) => {
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'Projeto não encontrado' }, 404);
    const { novoEstado, motivo } = c.req.valid('json');
    const userId = c.get('user').id;
    const userRole = c.get('user').role;

    try {
      const perfilId = await resolvePerfilId(userId);
      if (!perfilId) return c.json({ error: 'Identidade não localizada' }, 404);

      const resGet = await strapiGet<StrapiProjeto>(`/projetos/${id}`, { populate: 'autor' });
      const project = firstProjeto(resGet.data);
      if (!project) return c.json({ error: 'Projeto não encontrado' }, 404);

      const estadoActual = project.estado;
      const isAutor = project.autor?.userId === userId;
      const isModerador = ['moderador', 'super_admin'].includes(userRole);

      const transicoesPermitidas = isAutor
        ? TRANSICOES_AUTOR[estadoActual] ?? []
        : isModerador
          ? TRANSICOES_MODERADOR[estadoActual] ?? []
          : [];

      if (!transicoesPermitidas.includes(novoEstado)) {
        return c.json({ error: `Transição ${estadoActual} → ${novoEstado} não permitida` }, 403);
      }

      const now = new Date().toISOString();
      const historico: HistoricoEstado[] = project.historicoEstados ?? [];
      historico.push({ estado: novoEstado, timestamp: now, autorId: perfilId });

      await strapiPut(`/projetos/${id}`, {
        estado: novoEstado,
        historicoEstados: historico,
        ...(motivo && novoEstado === 'draft' ? { motivoRejeicao: motivo } : {}),
      });

      const eventMap: Record<string, DomainEventName> = {
        review: DomainEventName.PROJETO_SUBMETIDO_PARA_REVISAO,
        approved: DomainEventName.PROJETO_APROVADO,
        published: DomainEventName.PROJETO_PUBLICADO,
        archived: DomainEventName.PROJETO_ARQUIVADO,
      };

      const eventName = eventMap[novoEstado];
      if (eventName) {
        const basePayload = { projetoId: id, titulo: project.titulo, area: project.area };
        const projectAuthorId = project.autor?.id;
        if (novoEstado === 'published' && projectAuthorId === undefined) {
          return c.json({ error: 'Autor do projeto não identificado' }, 502);
        }

        const payload = novoEstado === 'published'
          ? { ...basePayload, autorId: String(projectAuthorId) }
          : novoEstado === 'approved'
          ? { ...basePayload, aprovadorId: perfilId }
          : novoEstado === 'review' || novoEstado === 'archived'
            ? { ...basePayload, autorId: perfilId }
            : basePayload;

        await eventBus.publishWithOutbox(eventName, payload);
      }

      return c.json({ success: true, estado: novoEstado });
    } catch {
      return c.json({ error: 'Erro ao transitar estado do projeto' }, 502);
    }
  }
);
