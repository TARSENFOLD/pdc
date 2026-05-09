import { Hono } from 'hono';
import { z } from 'zod';
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
  async (c) => {
    const perfilId = c.req.param('perfilId') ?? '';
    const user = c.get('user');

    if (!perfilId) return c.json({ error: 'perfilId obrigatório' }, 400);

    try {
      const result = await aprovacaoService.aprovarPerfil(perfilId, user.id);
      return c.json({ success: true, perfilId, eventId: result.eventId });
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 404) return c.json({ error: 'Perfil não encontrado' }, 404);
      log.error({ err, perfilId }, '[aprovacoes] erro ao aprovar perfil');
      return c.json({ error: 'Erro ao aprovar perfil' }, 500);
    }
  },
);

// ─── POST /admin/aprovacoes/:perfilId/rejeitar ────────────────────────────────

adminAprovacoesRoutes.post(
  '/:perfilId/rejeitar',
  auditLog('perfil_rejeitar'),
  async (c) => {
    const perfilId = c.req.param('perfilId') ?? '';
    const user = c.get('user');

    if (!perfilId) return c.json({ error: 'perfilId obrigatório' }, 400);

    let body: { motivo: string };
    try {
      body = RejeitarBodySchema.parse(await c.req.json());
    } catch {
      return c.json({ error: 'motivo é obrigatório (10–500 caracteres)' }, 400);
    }

    try {
      const result = await aprovacaoService.rejeitarPerfil(perfilId, user.id, body.motivo);
      return c.json({ success: true, perfilId, eventId: result.eventId });
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 404) return c.json({ error: 'Perfil não encontrado' }, 404);
      log.error({ err, perfilId }, '[aprovacoes] erro ao rejeitar perfil');
      return c.json({ error: 'Erro ao rejeitar perfil' }, 500);
    }
  },
);

export { adminAprovacoesRoutes };
