import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet, strapiPost, strapiPut, strapiDelete } from '../modules/strapi/strapi.client.js';
import { type Projeto, CriarProjetoPayloadSchema } from '@pdc/shared';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';

type Vars = { Variables: AuthVariables };
export const projetoRoutes = new Hono<Vars>();

projetoRoutes.use('*', verifyJwt);

interface StrapiProjetoWithAutor {
  id: string | number;
  autor?: { userId: string; id: string | number };
  core?: unknown;
  colaboradores?: Array<{ id: string | number }> | null;
  pedidosAcesso?: Array<{ perfilSolicitante?: { id: string | number }; status: string }> | null;
}

interface StrapiPedido {
  id: string | number;
  projeto?: { id: string | number };
  status: string;
}

function resolvePerfilId(perfilId: string | undefined, projeto: StrapiProjetoWithAutor): boolean {
  if (!perfilId) return false;
  if (String(projeto.autor?.id) === perfilId) return true;
  const colabs = projeto.colaboradores ?? [];
  if (Array.isArray(colabs) && colabs.some((c) => String(c.id) === perfilId)) return true;
  const pedidos = projeto.pedidosAcesso ?? [];
  if (Array.isArray(pedidos) && pedidos.some(
    (p) => p.status === 'aprovado' && String(p.perfilSolicitante?.id) === perfilId
  )) return true;
  return false;
}

async function getPerfilId(userId: string): Promise<string | undefined> {
  const resPerfil = await strapiGet<{ id: string }>('/perfis', {
    'filters[userId][$eq]': userId,
    'fields[0]': 'id',
  });
  return resPerfil.data[0] ? String(resPerfil.data[0].id) : undefined;
}

function stripCore(projeto: StrapiProjetoWithAutor, authorized: boolean): unknown {
  const result = { ...(projeto as unknown as Record<string, unknown>) };
  if (!authorized) {
    delete result['core'];
  }
  return result;
}

// GET /projetos
projetoRoutes.get('/', async (c) => {
  const { id: userId } = c.get('user');
  try {
    const [res, perfilId] = await Promise.all([
      strapiGet<StrapiProjetoWithAutor>('/projetos', {
        populate: 'autor,pedidosAcesso.perfilSolicitante',
        sort: 'createdAt:desc',
      }),
      getPerfilId(userId),
    ]);

    const data = res.data.map((p) => stripCore(p, resolvePerfilId(perfilId, p)));
    return c.json({ ...res, data });
  } catch (_err) {
    return c.json({ error: 'Falha ao sincronizar o ecossistema de projetos' }, 502);
  }
});

// GET /projetos/meus
projetoRoutes.get('/meus', async (c) => {
  const { id: userId } = c.get('user');
  try {
    const perfilId = await getPerfilId(userId);
    if (!perfilId) return c.json({ error: 'Identidade não localizada' }, 404);

    const res = await strapiGet<StrapiProjetoWithAutor>('/projetos', {
      'filters[autor][id][$eq]': perfilId,
      populate: 'media,pedidosAcesso.perfilSolicitante',
    });

    const data = res.data.map((p) => stripCore(p, true));
    return c.json({ ...res, data });
  } catch (_err) {
    return c.json({ error: 'Erro ao recuperar os teus ativos' }, 502);
  }
});

// GET /projetos/:id
projetoRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const { id: userId } = c.get('user');
  try {
    const [res, perfilId] = await Promise.all([
      strapiGet<StrapiProjetoWithAutor>(`/projetos/${id}`, {
        populate: 'autor,colaboradores,pedidosAcesso.perfilSolicitante',
      }),
      getPerfilId(userId),
    ]);

    const projeto = Array.isArray(res.data) ? res.data[0] : (res.data as unknown as StrapiProjetoWithAutor);
    if (!projeto) return c.json({ error: 'Projeto não encontrado' }, 404);

    const authorized = resolvePerfilId(perfilId, projeto);
    return c.json(stripCore(projeto, authorized));
  } catch (_err) {
    return c.json({ error: 'Falha ao carregar projeto' }, 502);
  }
});

// POST /projetos
projetoRoutes.post('/', async (c) => {
  const { id: userId } = c.get('user');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Payload inválido' }, 400);
  }

  const parsed = CriarProjetoPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validação falhou', issues: parsed.error.issues }, 422);
  }

  try {
    const perfilId = await getPerfilId(userId);
    if (!perfilId) return c.json({ error: 'Identidade não localizada' }, 404);

    const res = await strapiPost<Projeto>('/projetos', {
      ...parsed.data,
      autor: perfilId,
    });

    const projetoId = res.data.id;

    await eventBus.publishWithOutbox(DomainEventName.PROJETO_PUBLICADO, {
      projetoId,
      autorId: perfilId,
      titulo: parsed.data.titulo,
      area: parsed.data.area,
    });

    return c.json(res.data, 201);
  } catch (_err) {
    return c.json({ error: 'Falha na publicação do projeto' }, 502);
  }
});
// PUT /projetos/:id
projetoRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const { id: userId } = c.get('user');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Payload inválido' }, 400);
  }

  const parsed = CriarProjetoPayloadSchema.partial().safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validação falhou', issues: parsed.error.issues }, 422);
  }

  try {
    const [resGet, perfilId] = await Promise.all([
      strapiGet<StrapiProjetoWithAutor>(`/projetos/${id}`, { populate: 'autor' }),
      getPerfilId(userId),
    ]);

    const existing = Array.isArray(resGet.data) ? resGet.data[0] : (resGet.data as unknown as StrapiProjetoWithAutor);

    if (!existing) return c.json({ error: 'Projeto não identificado' }, 404);
    if (String(existing.autor?.id) !== perfilId) return c.json({ error: 'Autoridade insuficiente' }, 403);

    const res = await strapiPut<Projeto>(`/projetos/${id}`, parsed.data);
    return c.json(res.data);
  } catch (_err) {
    return c.json({ error: 'Falha ao actualizar projeto' }, 502);
  }
});

// POST /projetos/:id/pedidos-acesso
projetoRoutes.post('/:id/pedidos-acesso', async (c) => {
  const projetoId = c.req.param('id');
  const { id: userId } = c.get('user');

  let motivo: string | undefined;
  try {
    const json = await c.req.json() as Record<string, unknown>;
    if (typeof json.motivo === 'string') {
      motivo = json.motivo;
    }
  } catch {
    // motivo é opcional, silenciar parse error
  }

  try {
    const perfilId = await getPerfilId(userId);
    if (!perfilId) return c.json({ error: 'Identidade não localizada' }, 404);

    // Verify projeto exists and requester is not the autor
    const resGet = await strapiGet<StrapiProjetoWithAutor>(`/projetos/${projetoId}`, { populate: 'autor' });
    const projeto = Array.isArray(resGet.data) ? resGet.data[0] : (resGet.data as unknown as StrapiProjetoWithAutor);
    if (!projeto) return c.json({ error: 'Projeto não encontrado' }, 404);
    if (String(projeto.autor?.id) === perfilId) {
      return c.json({ error: 'Autor não precisa solicitar acesso' }, 400);
    }

    const res = await strapiPost('/projeto-acesso-pedidos', {
      projeto: projetoId,
      perfilSolicitante: perfilId,
      motivo: motivo ?? '',
      status: 'pendente',
    });

    return c.json(res.data, 201);
  } catch (_err) {
    return c.json({ error: 'Falha ao submeter pedido de acesso' }, 502);
  }
});

// PUT /projetos/:id/pedidos-acesso/:pedidoId — autor aprova ou rejeita
projetoRoutes.put('/:id/pedidos-acesso/:pedidoId', async (c) => {
  const projetoId = c.req.param('id');
  const pedidoId = c.req.param('pedidoId');
  const { id: userId } = c.get('user');

  let body: { status: 'aprovado' | 'rejeitado' };
  try {
    body = await c.req.json() as typeof body;
  } catch {
    return c.json({ error: 'Payload inválido' }, 400);
  }

  if (!body?.status || !['aprovado', 'rejeitado'].includes(body.status)) {
    return c.json({ error: 'Status inválido. Use aprovado ou rejeitado' }, 400);
  }

  try {
    const [resGet, resPedido, perfilId] = await Promise.all([
      strapiGet<StrapiProjetoWithAutor>(`/projetos/${projetoId}`, { populate: 'autor' }),
      strapiGet<StrapiPedido>(`/projeto-acesso-pedidos/${pedidoId}`, { populate: 'projeto' }),
      getPerfilId(userId),
    ]);

    const projeto = Array.isArray(resGet.data) ? resGet.data[0] : (resGet.data as unknown as StrapiProjetoWithAutor);
    if (!projeto) return c.json({ error: 'Projeto não encontrado' }, 404);

    const pedido = Array.isArray(resPedido.data) ? resPedido.data[0] : resPedido.data;
    if (!pedido || String(pedido.projeto?.id) !== projetoId) {
      return c.json({ error: 'Pedido não pertence a este projeto' }, 403);
    }

    if (pedido.status !== 'pendente') {
      return c.json({ error: 'Este pedido já foi processado' }, 409);
    }

    if (String(projeto.autor?.id) !== perfilId) {
      return c.json({ error: 'Apenas o autor pode responder pedidos de acesso' }, 403);
    }

    const res = await strapiPut(`/projeto-acesso-pedidos/${pedidoId}`, {
      status: body.status,
      dataResposta: new Date().toISOString(),
    });

    return c.json(res.data);
  } catch (_err) {
    return c.json({ error: 'Falha ao responder pedido de acesso' }, 502);
  }
});

// DELETE /projetos/:id
projetoRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const { id: userId } = c.get('user');

  try {
    const [resGet, perfilId] = await Promise.all([
      strapiGet<StrapiProjetoWithAutor>(`/projetos/${id}`, { populate: 'autor' }),
      getPerfilId(userId),
    ]);
    const existing = Array.isArray(resGet.data) ? resGet.data[0] : (resGet.data as unknown as StrapiProjetoWithAutor);

    if (!existing) return c.json({ error: 'Projeto não identificado' }, 404);

    if (String(existing.autor?.id) !== perfilId) {
      return c.json({ error: 'Autoridade insuficiente' }, 403);
    }

    await strapiDelete(`/projetos/${id}`);
    return c.json({ success: true });
  } catch (_err) {
    return c.json({ error: 'Falha na eliminação do ativo' }, 502);
  }
});
