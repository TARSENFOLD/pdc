import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { CriarProgramaPayloadSchema } from '@pdc/shared';

type Vars = { Variables: AuthVariables };
export const programaRoutes = new Hono<Vars>();

programaRoutes.use('*', verifyJwt);

interface StrapiPrograma {
  id: string;
  perfilId?: string | { id: string };
  metadata?: unknown;
  titulo?: string;
  area?: string;
  tipo?: string;
}

// GET /programas/meus
programaRoutes.get('/meus', async (c) => {
  const { id: userId } = c.get('user');

  try {
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
    });
    const perfilId = resPerfil.data[0]?.id;

    if (!perfilId) return c.json({ data: [] });

    const res = await strapiGet<StrapiPrograma>('/inscricoes-programas', {
      'filters[perfil][id][$eq]': String(perfilId),
      populate: 'programa',
    });

    return c.json(res);
  } catch (_err) {
    return c.json({ error: 'Erro ao carregar teus programas' }, 502);
  }
});

// POST /programas — criar programa com validação canónica
programaRoutes.post('/', async (c) => {
  const { id: userId } = c.get('user');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Payload inválido' }, 400);
  }

  const parsed = CriarProgramaPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validação falhou', issues: parsed.error.issues }, 422);
  }

  const {
    profissionalShadow,
    areaShadowing,
    visitaUrl,
    localizacaoFisica,
    instituicaoId,
    cronograma,
    ...rest
  } = parsed.data;

  try {
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
    });
    const perfilId = resPerfil.data[0]?.id;

    if (!perfilId) {
      return c.json({ error: 'Perfil não encontrado para o utilizador' }, 404);
    }

    const strapiPayload: Record<string, unknown> = {
      ...rest,
      cronograma: cronograma ?? null,
      metadata: {
        ...(profissionalShadow ? { profissionalShadow } : {}),
        ...(areaShadowing ? { areaShadowing } : {}),
        ...(visitaUrl ? { visitaUrl } : {}),
        ...(localizacaoFisica ? { localizacaoFisica } : {}),
        criadorPerfilId: perfilId,
      },
    };

    if (instituicaoId) strapiPayload['instituicao'] = instituicaoId;

    const res = await strapiPost<StrapiPrograma>('/programas', strapiPayload);

    await eventBus.publishWithOutbox(DomainEventName.PROGRAMA_CRIADO, {
      programaId: res.data.id,
      autorId: String(perfilId),
      titulo: rest.titulo,
      area: rest.area,
      criadorTipo: parsed.data.criadorTipo ?? 'instituicao',
    });

    return c.json(res.data, 201);
  } catch (_err) {
    return c.json({ error: 'Erro ao criar programa' }, 502);
  }
});

// PUT /programas/:id — actualizar programa
programaRoutes.put('/:id', async (c) => {
  const programaId = c.req.param('id');
  const { id: userId } = c.get('user');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Payload inválido' }, 400);
  }

  const parsed = CriarProgramaPayloadSchema.partial().safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validação falhou', issues: parsed.error.issues }, 422);
  }

  const {
    profissionalShadow,
    areaShadowing,
    visitaUrl,
    localizacaoFisica,
    instituicaoId,
    cronograma,
    ...rest
  } = parsed.data;

  try {
    // 🔐 G2: Autoridade Soberana — Verificar se o utilizador é o criador
    const [resExisting, resPerfil] = await Promise.all([
      strapiGet<StrapiPrograma>(`/programas/${programaId}`),
      strapiGet<{ id: string }>('/perfis', {
        'filters[userId][$eq]': userId,
        'fields[0]': 'id',
      }),
    ]);

    const existing = resExisting.data as unknown as StrapiPrograma;
    if (!existing || !existing.id) return c.json({ error: 'Programa não encontrado' }, 404);

    const perfil = resPerfil.data[0];
    if (!perfil) {
      return c.json({ error: 'Perfil não encontrado para o utilizador' }, 404);
    }

    const perfilId = perfil.id;
    const existingMetadata = (existing.metadata as Record<string, unknown>) ?? {};

    const rawCriadorId = existingMetadata.criadorPerfilId || existing.perfilId;
    const criadorId = typeof rawCriadorId === 'object' && rawCriadorId !== null ? (rawCriadorId as any).id : rawCriadorId;

    if (String(criadorId) !== String(perfilId)) {
      return c.json({ error: 'Autoridade insuficiente para editar este programa' }, 403);
    }

    const strapiPayload: Record<string, unknown> = { ...rest };

    if (cronograma !== undefined) {
      strapiPayload['cronograma'] = cronograma;
    }

    if (profissionalShadow || areaShadowing || visitaUrl || localizacaoFisica) {
      strapiPayload['metadata'] = {
        ...existingMetadata,
        ...(profissionalShadow ? { profissionalShadow } : {}),
        ...(areaShadowing ? { areaShadowing } : {}),
        ...(visitaUrl ? { visitaUrl } : {}),
        ...(localizacaoFisica ? { localizacaoFisica } : {}),
      };
    }

    if (instituicaoId) strapiPayload['instituicao'] = instituicaoId;

    const res = await strapiPut<StrapiPrograma>(`/programas/${programaId}`, strapiPayload);
    return c.json(res.data);
  } catch (_err) {
    return c.json({ error: 'Erro ao actualizar programa' }, 502);
  }
});

// POST /programas/:id/concluir
programaRoutes.post('/:id/concluir', async (c) => {
  const programaId = c.req.param('id');
  const { id: userId } = c.get('user');

  try {
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
    });
    const perfilId = resPerfil.data[0]?.id;

    const resInscr = await strapiGet<StrapiPrograma>('/inscricoes-programas', {
      'filters[perfil][id][$eq]': String(perfilId),
      'filters[programa][id][$eq]': programaId,
    });

    const existing = resInscr.data[0];
    if (!existing) return c.json({ error: 'Inscrição não encontrada' }, 404);

    await strapiPut(`/inscricoes-programas/${existing.id}`, {
      concluido: true,
      dataConclusao: new Date().toISOString(),
      metadata: {
        ...(existing.metadata || {}),
        concluidoVia: 'api',
      }
    });

    await eventBus.publishWithOutbox(DomainEventName.PROGRAMA_CONCLUIDO, {
      programaId,
      perfilId: String(perfilId),
    });

    return c.json({ success: true });
  } catch (_err) {
    return c.json({ error: 'Erro ao concluir programa' }, 502);
  }
});
