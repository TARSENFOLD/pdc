import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { verifyJwt, optionalJwt, checkRole, type OptionalAuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet, strapiPost, strapiPut, strapiDelete } from '../modules/strapi/strapi.client.js';
import { CriarProjetoPayloadSchema, GerirACLSchema, type Projeto, type ACLEntry } from '@pdc/shared';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';

type Vars = { Variables: OptionalAuthVariables };
export const projetoRoutes = new Hono<Vars>();

interface StrapiProjeto extends Omit<Projeto, 'autor'> {
  autor?: { id: string; userId: string };
  acessoCoreACL?: ACLEntry[];
}

function filterCoreField(projeto: StrapiProjeto, perfilId: string | null): Partial<StrapiProjeto> {
  const isAutor = perfilId && String(projeto.autor?.id) === String(perfilId);
  const hasApprovedAccess = perfilId && projeto.acessoCoreACL?.some(
    (entry) => String(entry.perfilId) === String(perfilId) && entry.estado === 'approved'
  );

  if (isAutor || hasApprovedAccess) {
    return projeto;
  }

  const { core, ...publicData } = projeto;
  void core;
  return publicData;
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
projetoRoutes.get('/', optionalJwt, async (c) => {
  try {
    const userId = c.get('user')?.id;
    const perfilId = await resolvePerfilId(userId);

    const res = await strapiGet<StrapiProjeto>('/projetos', {
      populate: 'autor,media',
      sort: 'createdAt:desc',
    });

    const filteredData = res.data.map(p => filterCoreField(p, perfilId));
    return c.json({ ...res, data: filteredData });
  } catch (_err) {
    return c.json({ error: 'Falha ao sincronizar o ecossistema de projetos' }, 502);
  }
});

// GET /projetos/meus — requer autenticação
projetoRoutes.get('/meus', verifyJwt, async (c) => {
  const userId = c.get('user')!.id;
  try {
    const perfilId = await resolvePerfilId(userId);
    if (!perfilId) return c.json({ error: 'Identidade não localizada' }, 404);

    const res = await strapiGet<StrapiProjeto>('/projetos', {
      'filters[autor][id][$eq]': perfilId,
      populate: 'media',
    });
    return c.json(res);
  } catch (_err) {
    return c.json({ error: 'Erro ao recuperar os teus ativos' }, 502);
  }
});

// GET /projetos/:id — público, core filtrado por ACL
projetoRoutes.get('/:id', optionalJwt, async (c) => {
  const id = c.req.param('id');
  try {
    const userId = c.get('user')?.id;
    const perfilId = await resolvePerfilId(userId);

    const res = await strapiGet<StrapiProjeto>(`/projetos/${id}`, {
      populate: 'autor,media',
    });

    const project = Array.isArray(res.data) ? res.data[0] : res.data;
    if (!project) return c.json({ error: 'Projeto não encontrado' }, 404);

    return c.json({ data: [filterCoreField(project, perfilId)] });
  } catch (_err) {
    return c.json({ error: 'Erro ao carregar projeto' }, 502);
  }
});

// POST /projetos — estudante, mentor, instituição, super_admin
projetoRoutes.post('/',
  verifyJwt,
  checkRole(['estudante', 'mentor', 'instituicao', 'super_admin']),
  zValidator('json', CriarProjetoPayloadSchema),
  async (c) => {
    const body = c.req.valid('json');
    const userId = c.get('user')!.id;

    try {
      const perfilId = await resolvePerfilId(userId);
      if (!perfilId) return c.json({ error: 'Identidade não localizada' }, 404);

      const slug = `${body.titulo.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')}-${Math.random().toString(36).substring(2, 7)}`;

      const res = await strapiPost<StrapiProjeto>('/projetos', {
        ...body,
        autor: perfilId,
        estado: 'published',
        slug,
        acessoCoreACL: [],
        votos: [],
      });

      const projetoId = res.data.id;

      const event = await eventBus.publishWithOutbox(DomainEventName.PROJETO_PUBLICADO, {
        projetoId,
        autorId: perfilId,
        titulo: body.titulo,
        area: body.area,
      });

      return c.json({ ...res.data, eventId: event?.id }, 201);
    } catch (_err) {
      return c.json({ error: 'Falha na publicação do projeto' }, 502);
    }
  }
);

// POST /projetos/:id/solicitar-acesso — requer autenticação
projetoRoutes.post('/:id/solicitar-acesso', verifyJwt, async (c) => {
  const id = c.req.param('id');
  const userId = c.get('user')!.id;

  try {
    const perfilId = await resolvePerfilId(userId);
    if (!perfilId) return c.json({ error: 'Identidade não localizada' }, 404);

    const resGet = await strapiGet<StrapiProjeto>(`/projetos/${id}`, { populate: 'autor' });
    const project = Array.isArray(resGet.data) ? resGet.data[0] : resGet.data;
    if (!project) return c.json({ error: 'Projeto não encontrado' }, 404);

    const acl = project.acessoCoreACL || [];
    if (acl.some(entry => String(entry.perfilId) === String(perfilId))) {
      return c.json({ error: 'Pedido já existe ou acesso já concedido' }, 400);
    }

    const newEntry: ACLEntry = {
      perfilId,
      estado: 'pending',
      solicitadoEm: new Date().toISOString(),
    };

    await strapiPut(`/projetos/${id}`, { acessoCoreACL: [...acl, newEntry] });

    await eventBus.publishWithOutbox(DomainEventName.PROJETO_ACESSO_SOLICITADO, {
      projetoId: id,
      autorId: perfilId,
      targetId: String(project.autor?.id),
    });

    return c.json({ success: true });
  } catch (_err) {
    return c.json({ error: 'Erro ao solicitar acesso' }, 502);
  }
});

// PATCH /projetos/:id/acl — apenas o autor pode gerir
projetoRoutes.patch('/:id/acl',
  verifyJwt,
  zValidator('json', GerirACLSchema),
  async (c) => {
    const id = c.req.param('id');
    const { perfilId, acao } = c.req.valid('json');
    const userId = c.get('user')!.id;

    try {
      const resGet = await strapiGet<StrapiProjeto>(`/projetos/${id}`, { populate: 'autor' });
      const project = resGet.data[0];
      if (!project) return c.json({ error: 'Projeto não encontrado' }, 404);

      if (project.autor?.userId !== userId) {
        return c.json({ error: 'Apenas o autor pode gerir o acesso ao Core' }, 403);
      }

      const acl = project.acessoCoreACL || [];
      const entryIdx = acl.findIndex(e => String(e.perfilId) === String(perfilId));
      if (entryIdx === -1) return c.json({ error: 'Solicitação não encontrada' }, 404);

      const entry = acl[entryIdx];
      if (!entry) return c.json({ error: 'Erro interno' }, 500);

      entry.estado = acao === 'aprovar' ? 'approved' : 'rejected';
      entry.respondidoEm = new Date().toISOString();

      await strapiPut(`/projetos/${id}`, { acessoCoreACL: acl });

      await eventBus.publishWithOutbox(
        acao === 'aprovar' ? DomainEventName.PROJETO_ACESSO_CONCEDIDO : DomainEventName.PROJETO_ACESSO_RECUSADO,
        {
          projetoId: id,
          autorId: String(project.autor?.id),
          targetId: perfilId,
        }
      );

      return c.json({ success: true });
    } catch (_err) {
      return c.json({ error: 'Erro ao gerir ACL' }, 502);
    }
  }
);

// DELETE /projetos/:id — apenas o autor
projetoRoutes.delete('/:id', verifyJwt, async (c) => {
  const id = c.req.param('id');
  const userId = c.get('user')!.id;

  try {
    const resGet = await strapiGet<StrapiProjeto>(`/projetos/${id}`, { populate: 'autor' });
    const existing = Array.isArray(resGet.data) ? resGet.data[0] : resGet.data;

    if (!existing) return c.json({ error: 'Projeto não identificado' }, 404);

    if (existing.autor?.userId !== userId) {
      return c.json({ error: 'Autoridade insuficiente' }, 403);
    }

    await strapiDelete(`/projetos/${id}`);
    return c.json({ success: true });
  } catch (_err) {
    return c.json({ error: 'Falha na eliminação do ativo' }, 502);
  }
});
