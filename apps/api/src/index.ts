import { env } from './lib/env.js';
import { serve } from '@hono/node-server';
import type { Server } from 'node:http';
import pino from 'pino';

const log = pino();
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { securityMiddleware as security } from './middleware/security.js';
import { noStoreCache } from './middleware/cache.js';
import { authRoutes } from './routes/auth.js';
import { aiRoutes } from './routes/ai.js';
import { feedRoutes } from './routes/feed.js';
import { cursoRoutes } from './routes/cursos.js';
import { ltiRoutes } from './routes/lti.js';
import { catalogoRoutes } from './routes/catalogo.js';
import { simulacaoRoutes } from './routes/simulacoes.js';
import { telemetriaRoutes } from './routes/telemetria.js';
import { tinaRoutes } from './routes/tina.js';
import { socketService } from './modules/realtime/socket.service.js';
import { tinaService } from './modules/tina/tina.service.js';
import { experienciaRoutes } from './routes/experiencias.js';
import { programasRoutes } from './routes/programas.js';
import { propostasRoutes } from './routes/propostas.js';
import { interactionRoutes } from './routes/interactions.js';
import { estudanteRoutes } from './routes/estudante.js';
import { ratingsRoutes } from './routes/ratings.js';
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
import { mediaRoutes } from './routes/media.js';
import { notificacaoRoutes } from './routes/notificacoes.js';
import { perfilRoutes } from './routes/perfis.js';
import { denunciaRoutes } from './routes/denuncias.js';
import { featureFlagRoutes } from './routes/feature-flags.js';
import { reputationRoutes } from './routes/reputation.js';
import { discussionRoutes } from './routes/discussions.js';
import { healthRoutes } from './routes/health.js';
import { landingRoutes } from './routes/landing.js';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: env.NODE_ENV ?? 'development',
    release: process.env.npm_package_version ?? '0.0.0',
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 1.0,
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

const app = new Hono();

app.use('*', logger());
app.use('*', secureHeaders({
  xFrameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin',
}));
app.use('*', cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
app.use('*', security);
app.use('*', noStoreCache);

app.route('/auth', authRoutes);
app.route('/health', healthRoutes);
app.route('/ai', aiRoutes);
app.route('/cursos', cursoRoutes);
app.route('/lti', ltiRoutes);
app.route('/catalogo', catalogoRoutes);
app.route('/feed', feedRoutes);
app.route('/programas', programasRoutes);
app.route('/propostas', propostasRoutes);
app.route('/interactions', interactionRoutes);
app.route('/estudante', estudanteRoutes);
app.route('/ratings', ratingsRoutes);
app.route('/comments', commentsRoutes);
app.route('/moderacao', moderacaoRoutes);
app.route('/admin', adminRoutes);
app.route('/comite', comiteRoutes);
app.route('/vinculos', vinculoRoutes);
app.route('/mensagens', mensagensRoutes);
app.route('/seo', seoRoutes);
app.route('/experiencias', experienciaRoutes);
app.route('/simulacoes', simulacaoRoutes);
app.route('/telemetria', telemetriaRoutes);
app.route('/tina', tinaRoutes);
app.route('/conquistas', conquistaRoutes);
app.route('/mentorias', mentoriaRoutes);
app.route('/projetos', projetoRoutes);
app.route('/vocacional', vocacionalRoutes);
app.route('/media', mediaRoutes);
app.route('/notificacoes', notificacaoRoutes);
app.route('/perfis', perfilRoutes);
app.route('/denuncias', denunciaRoutes);
app.route('/feature-flags', featureFlagRoutes);
app.route('/admin/reputation', reputationRoutes);
app.route('/discussions', discussionRoutes);
app.route('/landing', landingRoutes);

const server = serve({
  fetch: app.fetch,
  port: parseInt(env.PORT),
}, (info) => {
  log.info({ port: info.port }, 'BFF ouvindo');
});

socketService.init(server as Server);
tinaService.indexarKnowledge().catch((err: unknown) => { log.error({ err }, 'Falha ao indexar Tina'); });

export type AppType = typeof app;
