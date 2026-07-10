import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { verifyJwt, type AuthVariables } from '../../modules/auth/auth.middleware.js';
import { checkRole } from '../../modules/auth/rbac.middleware.js';
import { auditLog } from '../../middleware/audit.js';
import { aprovacaoService } from '../../modules/aprovacao/aprovacao.service.js';
import pino from 'pino';

const log = pino({ name: 'admin-aprovacoes-routes' });

type Vars = { Variables: AuthVariables };

const TipoQuerySchema = z.enum(['mentor', 'instituicao']);

const RejeitarBodySchema = z.object({
  motivo: z.string().min(10).max(500),
});

const PerfilIdParamSchema = z.object({
  perfilId: z.string().regex(/^\d+$/, 'perfilId deve ser numérico'),
});

const adminAprovacoesRoutes = new Hono<Vars>();

adminAprovacoesRoutes.use('*', verifyJwt);
adminAprovacoesRoutes.use('*', checkRole(['super_admin']));

// ─── GET /admin/aprovacoes/pendentes ─────────────────────────────────────────

adminAprovacoesRoutes.get('/pendentes', async (c) => {
  const tipoRaw = c.req.query('tipo') ?? 'mentor';
  const tipoResult = TipoQuerySchema.safeParse(tipoRaw);

  if (!tipoResult.success) {
    return c.json({ error: 'Tipo inválido. Use mentor ou instituicao.' }, 400);
  }
  if (tipoResult.data === 'instituicao') {
    return c.json({
      error: 'A verificação institucional usa /instituicoes/admin/pendentes e /instituicoes/admin/:id/estado.',
    }, 410);
  }

  try {
    const pendentes = await aprovacaoService.listarPendentes(tipoResult.data);
    return c.json({ data: pendentes, meta: { total: pendentes.length } });
  } catch (err) {
    log.error({ err }, '[aprovacoes] erro ao listar pendentes');
    return c.json({ error: 'Erro ao listar pendentes' }, 500);
  }
});

// ─── POST /admin/aprovacoes/:perfilId/aprovar ─────────────────────────────────

adminAprovacoesRoutes.post(
  '/:perfilId/aprovar',
  auditLog('perfil_aprovar'),
  zValidator('param', PerfilIdParamSchema),
  async (c) => {
    const { perfilId } = c.req.valid('param');
    const user = c.get('user');

    try {
      const result = await aprovacaoService.aprovarPerfil(perfilId, user.id);
      return c.json({ success: true, perfilId, eventId: result.eventId });
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 404) return c.json({ error: 'Perfil não encontrado' }, 404);
      if (status === 410) return c.json({ error: 'Instituições usam o fluxo canónico de verificação institucional.' }, 410);
      log.error({ err, perfilId }, '[aprovacoes] erro ao aprovar perfil');
      return c.json({ error: 'Erro ao aprovar perfil' }, 500);
    }
  },
);

// ─── POST /admin/aprovacoes/:perfilId/rejeitar ────────────────────────────────

adminAprovacoesRoutes.post(
  '/:perfilId/rejeitar',
  auditLog('perfil_rejeitar'),
  zValidator('param', PerfilIdParamSchema),
  zValidator('json', RejeitarBodySchema),
  async (c) => {
    const { perfilId } = c.req.valid('param');
    const user = c.get('user');
    const { motivo } = c.req.valid('json');

    try {
      const result = await aprovacaoService.rejeitarPerfil(perfilId, user.id, motivo);
      return c.json({ success: true, perfilId, eventId: result.eventId });
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 404) return c.json({ error: 'Perfil não encontrado' }, 404);
      if (status === 410) return c.json({ error: 'Instituições usam o fluxo canónico de verificação institucional.' }, 410);
      log.error({ err, perfilId }, '[aprovacoes] erro ao rejeitar perfil');
      return c.json({ error: 'Erro ao rejeitar perfil' }, 500);
    }
  },
);

export { adminAprovacoesRoutes };
