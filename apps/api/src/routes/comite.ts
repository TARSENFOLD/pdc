import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPut, strapiPost } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };

interface StrapiItem {
  id: string;
  titulo?: string;
  estado?: string;
  createdAt?: string;
  autor?: { id?: string; nome?: string };
  autorId?: { id?: string; nome?: string };
}

interface StrapiListResponse {
  data: StrapiItem[];
  meta?: { pagination?: { total?: number } };
}

interface StrapiSingleResponse {
  data: StrapiItem | null;
}

const ValidarPayloadSchema = z.object({
  acao: z.enum(['aprovar', 'rejeitar']),
  parecer: z.string().min(20).max(1000),
});

const paginacaoSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const comiteRoutes = new Hono<Vars>();

comiteRoutes.use('*', verifyJwt);
comiteRoutes.use('*', checkRole(['comite_cientifico', 'super_admin']));

// GET /comite/fila — só simulacao e experiencia (nunca curso)
comiteRoutes.get(
  '/fila',
  zValidator('query', paginacaoSchema.extend({ tipo: z.enum(['simulacao', 'experiencia']) })),
  async (c) => {
    const { tipo, page = 1, pageSize = 10 } = c.req.valid('query');
    const colecionNome = `${tipo}s`;

    try {
      const [items, total] = await Promise.all([
        strapiGet<StrapiListResponse>(`/${colecionNome}`, {
          'filters[estado][$eq]': 'review',
          'pagination[page]': page.toString(),
          'pagination[pageSize]': pageSize.toString(),
          'fields': 'id,titulo,estado,createdAt',
          'populate': 'autor,autorId',
        }),
        strapiGet<StrapiListResponse>(`/${colecionNome}`, {
          'filters[estado][$eq]': 'review',
          'pagination[pageSize]': '1',
        }),
      ]);

      const lista = items.data.map((item) => ({
        id: item.id,
        titulo: item.titulo,
        autorNome: item.autor?.nome ?? item.autorId?.nome ?? 'Desconhecido',
        submittedAt: item.createdAt,
        tipo,
      }));

      return c.json({
        data: lista,
        pagination: {
          page,
          pageSize,
          total: total.meta?.pagination?.total ?? 0,
          pageCount: Math.ceil((total.meta?.pagination?.total ?? 0) / pageSize),
        },
      });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 500);
    }
  }
);

// PUT /comite/:tipo/:id/validar
comiteRoutes.put(
  '/:tipo/:id/validar',
  zValidator('json', ValidarPayloadSchema),
  async (c) => {
    const tipo = c.req.param('tipo');
    const id = c.req.param('id');
    const { acao, parecer } = c.req.valid('json');
    const user = c.get('user');

    if (!['simulacao', 'experiencia'].includes(tipo)) {
      return c.json({ error: 'Tipo inválido. Comité só valida simulações e experiências.' }, 400);
    }

    const colecionNome = `${tipo}s`;

    try {
      const item = await strapiGet<StrapiSingleResponse>(`/${colecionNome}/${id}`);
      if (!item.data) return c.json({ error: 'Item não encontrado' }, 404);
      if (item.data.estado !== 'review') return c.json({ error: "Conteúdo não está em revisão. Só é possível validar itens com estado 'review'." }, 409);

      const novoEstado = acao === 'aprovar' ? 'approved' : 'draft';
      await strapiPut(`/${colecionNome}/${id}`, { estado: novoEstado });

      // Notificação ao autor
      const autorId = item.data.autor?.id ?? item.data.autorId?.id;
      if (autorId) {
        await strapiPost('/notificacoes', {
          destinatarioId: autorId,
          tipo: acao === 'aprovar' ? 'conteudo_aprovado' : 'conteudo_rejeitado',
          mensagem: `O seu ${tipo} "${item.data.titulo ?? ''}" foi ${acao === 'aprovar' ? 'aprovado' : 'rejeitado'} pelo Comité Científico. Parecer: ${parecer}`,
          lida: false,
        }).catch(() => {});
      }

      // Audit trail
      await strapiPost('/audit-logs', {
        userId: user.id,
        accao: `comite_${acao}_${tipo}`,
        recurso: `/${colecionNome}/${id}`,
        ip: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
        timestamp: new Date().toISOString(),
        detalhes: parecer,
      }).catch(() => {});

      return c.json({ success: true, estado: novoEstado });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 500);
    }
  }
);
