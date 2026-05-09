import { env } from './lib/env.js';
import { initSentry, sentryUserContext } from './middleware/sentry.js';
import { captureException } from '@sentry/node';
import { serve } from '@hono/node-server';
import type { Server } from 'node:http';
import pino from 'pino';

// Initialize Sentry first
initSentry();

const log = pino();
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { securityMiddleware as security } from './middleware/security.js';
import { noStoreCache } from './middleware/cache.js';
import { rateLimitGlobalIp } from './middleware/rateLimit.js';

// Rotas
import { authRoutes } from './routes/auth.js';
import { aiRoutes } from './routes/ai.js';
import { feedRoutes } from './routes/feed.js';
import { feedPostRoutes } from './routes/feed-posts.js';
import { cursoRoutes } from './routes/cursos.js';
import { ltiRoutes } from './routes/lti.js';
import { catalogoRoutes } from './routes/catalogo.js';
import { simulacaoRoutes } from './routes/simulacoes.js';
import { telemetriaRoutes } from './routes/telemetria.js';
import { tinaRoutes } from './routes/tina.js';
import { experienciaRoutes } from './routes/experiencias.js';
import { programaRoutes } from './routes/programas.js';
import { propostaRoutes } from './routes/propostas.js';
import { interactionRoutes } from './routes/interactions.js';
import { estudanteRoutes } from './routes/estudante.js';
import { ratingRoutes } from './routes/ratings.js';
import { commentsRoutes } from './routes/comments.js';
import { moderacaoRoutes } from './routes/moderacao.js';
import { adminRoutes } from './routes/admin.js';
import { comiteRoutes } from './routes/comite.js';
import { vinculoRoutes } from './routes/vinculos.js';
import { mensagensRoutes } from './routes/mensagens.js';
import { seoRoutes } from './routes/seo.js';
import { conquistaRoutes } from './routes/conquistas.js';
import { mentoriaRoutes } from './routes/mentorias.js';
import { projetoRoutes } from './routes/projetos.js';
import { vocacionalRoutes } from './routes/vocacional.js';
import { mediaRoutes, mediaPublicRoutes } from './routes/media.js';
import { notificacaoRoutes } from './routes/notificacoes.js';
import { perfilRoutes } from './routes/perfis.js';
import { denunciaRoutes } from './routes/denuncias.js';
import { featureFlagsRoutes } from './routes/feature-flags.js';
import { domainEventRoutes } from './routes/domain-events.js';
import { matchRoutes } from './routes/match.js';
import { reputationRoutes } from './routes/reputation.js';
import { rankingRoutes } from './routes/ranking.js';
import { bootstrapRoutes } from './routes/bootstrap.js';
import { dashboardRoutes } from './routes/dashboard/index.js';
import { landingRoutes } from './routes/landing.js';
import { healthRoutes } from './routes/health.js';
import { adminAprovacoesRoutes } from './routes/admin/aprovacoes.js';
import { homeRoutes } from './routes/home.js';

import { socketService } from './modules/realtime/socket.service.js';
import { tinaService } from './modules/tina/tina.service.js';
import { strapiGet } from './modules/strapi/strapi.client.js';
import { getPublicJwks } from './modules/lti/lti.jwks.js';

const app = new Hono();

// ─── MIDDLEWARES ───
// Capacitor iOS (server.hostname = 'usepdc.com') and Android TWA share the same
// production origin as the web PWA — no extra entry needed in prod. The
// capacitor://localhost entry covers local Capacitor dev builds.
app.use('*', cors({
  origin: env.NODE_ENV === 'production'
    ? ['https://usepdc.com', 'https://www.usepdc.com']
    : [env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174', 'capacitor://localhost', 'ionic://localhost'],
  credentials: true,
}));
app.use('*', rateLimitGlobalIp);
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', noStoreCache);
app.use('*', sentryUserContext);
app.use('/auth/*', security);

app.onError((err, c) => {
  captureException(err);
  log.error({ err, path: c.req.path }, 'Unhandled error');
  return c.json({ error: 'Internal Server Error' }, 500);
});

// ─── ROTAS ───
app.route('/app/home', homeRoutes);
app.route('/bootstrap', bootstrapRoutes);
app.route('/landing', landingRoutes);
app.route('/health', healthRoutes);
app.route('/auth', authRoutes);
app.route('/ai', aiRoutes);
app.route('/feed', feedRoutes);
app.route('/feed-posts', feedPostRoutes);
app.route('/cursos', cursoRoutes);
app.route('/lti', ltiRoutes);
app.route('/catalogo', catalogoRoutes);
app.route('/simulacoes', simulacaoRoutes);
app.route('/telemetria', telemetriaRoutes);
app.route('/tina', tinaRoutes);
interface UiString { key: string; value: string }
const VALID_CONTEXTS = ['landing', 'auth', 'dashboard', 'cursos', 'simulacoes', 'global'];

app.get('/app/copy/:contexto', async (c) => {
  const contexto = c.req.param('contexto');
  
  if (!VALID_CONTEXTS.includes(contexto)) {
    return c.json({ error: 'Contexto inválido' }, 400);
  }

  try {
    const res = await strapiGet<UiString>('/ui-strings', { 
      'filters[contexto][$eq]': contexto,
      'pagination[pageSize]': '1000'
    });
    
    const map: Record<string, string> = {};
    res.data.forEach((s) => { 
      if (s.key && s.value) map[s.key] = s.value; 
    });
    return c.json(map);
  } catch (err) {
    log.error({ err, contexto }, 'Falha ao recuperar UI Strings');
    return c.json({ error: 'Falha ao sincronizar copy' }, 502);
  }
});
app.route('/experiencias', experienciaRoutes);
app.route('/programas', programaRoutes);
app.route('/propostas', propostaRoutes);
app.route('/interactions', interactionRoutes);
app.route('/estudante', estudanteRoutes);
app.route('/ratings', ratingRoutes);
app.route('/comments', commentsRoutes);
app.route('/moderacao', moderacaoRoutes);
app.route('/admin/aprovacoes', adminAprovacoesRoutes);
app.route('/admin', adminRoutes);
app.route('/comite', comiteRoutes);
app.route('/vinculos', vinculoRoutes);
app.route('/mensagens', mensagensRoutes);
app.route('/seo', seoRoutes);
app.route('/conquistas', conquistaRoutes);
app.route('/mentorias', mentoriaRoutes);
app.route('/projetos', projetoRoutes);
app.route('/vocacional', vocacionalRoutes);
// Public media endpoints (local dev files, no auth) must be registered before protected routes.
app.route('/media', mediaPublicRoutes);
// Protected media endpoints require authenticated users.
app.route('/media', mediaRoutes);
app.route('/notificacoes', notificacaoRoutes);
app.route('/perfis', perfilRoutes);
app.route('/denuncias', denunciaRoutes);
app.route('/feature-flags', featureFlagsRoutes);
app.route('/domain-events', domainEventRoutes);
app.route('/dashboard', dashboardRoutes);
app.route('/match', matchRoutes);
app.route('/reputacao', reputationRoutes);
app.route('/reputation', reputationRoutes);
app.route('/ranking', rankingRoutes);

// ─── WELL-KNOWN ───
app.get('/.well-known/jwks.json', async (c) => {
  return c.json(await getPublicJwks());
});

const server = serve({
  fetch: app.fetch,
  port: parseInt(env.PORT),
}, (info) => {
  log.info({ port: info.port }, 'BFF Soberano Online');
});

// ─── ECOSSISTEMA G15 ───
import './modules/outbox/outbox-worker.js';
import { eventBus } from './modules/events/event-bus.js';
import { rankingHook } from './modules/hooks/ranking.hook.js';
import { feedHook } from './modules/hooks/feed.hook.js';
import { achievementHook } from './modules/hooks/achievement.hook.js';
import { notifyHook } from './modules/hooks/notify.hook.js';
import { matchHook } from './modules/hooks/match.hook.js';
import { behaviorHook } from './modules/hooks/behavior.hook.js';
import { registerApprovalCacheInvalidator } from './middleware/requireApproved.js';

// Registo de G15 Hooks (Músculo do Oráculo)
eventBus.registerHook(rankingHook);
eventBus.registerHook(feedHook);
eventBus.registerHook(matchHook);
eventBus.registerHook(behaviorHook);
eventBus.registerHook(achievementHook);
eventBus.registerHook(notifyHook);

registerApprovalCacheInvalidator();

socketService.init(server as Server);
tinaService.indexarKnowledge().catch((err: unknown) => { 
  log.error({ err }, 'Falha ao indexar Tina'); 
});

// ─── GRACEFUL SHUTDOWN ───
const shutdown = (signal: string) => {
  log.info({ signal }, 'Sinal recebido — a encerrar servidor BFF');
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export type AppType = typeof app;
