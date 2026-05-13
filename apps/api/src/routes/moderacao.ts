import { Hono, type Context } from 'hono';
import { z } from 'zod';
import pino from 'pino';
import * as Sentry from '@sentry/node';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { auditLog } from '../middleware/audit.js';
import { ConteudoTipoSchema, moderacaoService, type ConteudoTipo } from '../modules/moderacao/moderacao.service.js';

const log = pino({ name: 'moderacao-routes' });

type Vars = { Variables: AuthVariables };

const RejeitarBodySchema = z.object({
  motivo: z.string().min(10).max(500),
});

const moderacaoRoutes = new Hono<Vars>();

moderacaoRoutes.use('*', verifyJwt);
moderacaoRoutes.use('*', checkRole(['moderador', 'comite_cientifico', 'super_admin']));

// ─── GET /moderacao/fila ──────────────────────────────────────────────────────

moderacaoRoutes.get('/fila', async (c) => {
  const tipoRaw = c.req.query('tipo');
  const pageRaw = c.req.query('page');
  const pageSizeRaw = c.req.query('pageSize');

  const parsePositiveInt = (value: string | undefined, fallback: number): number | null => {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) return null;
    const parsed = parseInt(value, 10);
    return parsed >= 1 ? parsed : null;
  };
  const page = parsePositiveInt(pageRaw, 1);
  const pageSize = parsePositiveInt(pageSizeRaw, 10);

  if (page === null || pageSize === null) {
    return c.json({ error: 'page e pageSize devem ser inteiros positivos' }, 400);
  }

  const tipoResult = ConteudoTipoSchema.safeParse(tipoRaw);
  if (!tipoResult.success) {
    return c.json({ error: 'Tipo inválido. Use: curso, simulacao, experiencia, programa, projeto, feed-post' }, 400);
  }

  try {
    const result = await moderacaoService.listarPendentes(tipoResult.data, String(page), String(pageSize));
    return c.json(result);
  } catch (err) {
    log.error({ err }, '[moderacao] erro ao buscar fila');
    return c.json({ error: 'Erro ao buscar fila' }, 500);
  }
});

async function handleAprovar(c: Context<Vars, '/:tipo/:id/aprovar'>) {
  const tipoRaw = c.req.param('tipo');
  const id = c.req.param('id');
  const tipoResult = ConteudoTipoSchema.safeParse(tipoRaw);
  if (!tipoResult.success) return c.json({ error: 'Tipo inválido' }, 400);
  const tipo: ConteudoTipo = tipoResult.data;
  const user = c.get('user');
  try {
    const result = await moderacaoService.aprovarConteudo(tipo, id, user.id);
    return c.json({ success: true, tipo, id, eventId: result.eventId });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) return c.json({ error: 'Conteúdo não encontrado' }, 404);
    log.error({ err, tipo, id }, '[moderacao] erro ao aprovar conteúdo');
    return c.json({ error: 'Erro ao aprovar conteúdo' }, 500);
  }
}

async function handleRejeitar(c: Context<Vars, '/:tipo/:id/rejeitar'>) {
  const tipoRaw = c.req.param('tipo');
  const id = c.req.param('id');
  const tipoResult = ConteudoTipoSchema.safeParse(tipoRaw);
  if (!tipoResult.success) return c.json({ error: 'Tipo inválido' }, 400);
  const tipo: ConteudoTipo = tipoResult.data;
  const user = c.get('user');
  let body: { motivo: string };
  try {
    body = RejeitarBodySchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'motivo é obrigatório (10–500 caracteres)' }, 400);
  }
  try {
    const result = await moderacaoService.rejeitarConteudo(tipo, id, user.id, body.motivo);
    return c.json({ success: true, tipo, id, eventId: result.eventId });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) return c.json({ error: 'Conteúdo não encontrado' }, 404);
    log.error({ err, tipo, id }, '[moderacao] erro ao rejeitar conteúdo');
    return c.json({ error: 'Erro ao rejeitar conteúdo' }, 500);
  }
}

// ─── POST /moderacao/:tipo/:id/aprovar (canónico, alinha com KD-12) ──────────

moderacaoRoutes.post('/:tipo/:id/aprovar', auditLog('conteudo_aprovar'), handleAprovar);

// ─── POST /moderacao/:tipo/:id/rejeitar (canónico) ───────────────────────────

moderacaoRoutes.post('/:tipo/:id/rejeitar', auditLog('conteudo_rejeitar'), handleRejeitar);

// ─── PUT deprecated — grace period 30 dias (ADR-009 update 2026-05-09) ───────

moderacaoRoutes.put('/:tipo/:id/aprovar', auditLog('conteudo_aprovar'), async (c: Context<Vars, '/:tipo/:id/aprovar'>) => {
  Sentry.captureMessage('moderacao: PUT /:tipo/:id/aprovar deprecated — use POST', {
    level: 'warning',
    extra: { tipo: c.req.param('tipo'), id: c.req.param('id') },
  });
  return handleAprovar(c);
});

moderacaoRoutes.put('/:tipo/:id/rejeitar', auditLog('conteudo_rejeitar'), async (c: Context<Vars, '/:tipo/:id/rejeitar'>) => {
  Sentry.captureMessage('moderacao: PUT /:tipo/:id/rejeitar deprecated — use POST', {
    level: 'warning',
    extra: { tipo: c.req.param('tipo'), id: c.req.param('id') },
  });
  return handleRejeitar(c);
});

export { moderacaoRoutes };
