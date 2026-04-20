import { env } from './lib/env.js';
import { initSentry } from './middleware/sentry.js';
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

// Rotas
import { authRoutes } from './routes/auth.js';
import { aiRoutes } from './routes/ai.js';
import { feedRoutes } from './routes/feed.js';
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
import { mediaRoutes } from './routes/media.js';
import { notificacaoRoutes } from './routes/notificacoes.js';
import { perfilRoutes } from './routes/perfis.js';
import { denunciaRoutes } from './routes/denuncias.js';
import { featureFlagsRoutes } from './routes/feature-flags.js';
import { reputationRoutes } from './routes/reputation.js';
import { bootstrapRoutes } from './routes/bootstrap.js';
import { landingRoutes } from './routes/landing.js';
import { healthRoutes } from './routes/health.js';

import { socketService } from './modules/realtime/socket.service.js';
import { tinaService } from './modules/tina/tina.service.js';
import { replayUnprocessedEvents } from './modules/events/outbox-replay.js';

const app = new Hono();

// ─── MIDDLEWARES ───
app.use('*', cors({
  origin: env.NODE_ENV === 'production' 
    ? ['https://usepdc.com', 'https://www.usepdc.com'] 
    : [env.FRONTEND_URL, 'http://localhost:5173'],
  credentials: true,
}));
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', noStoreCache);
app.use('/auth/*', security);

// ─── ROTAS ───
app.route('/bootstrap', bootstrapRoutes);
app.route('/landing', landingRoutes);
app.route('/health', healthRoutes);
app.route('/auth', authRoutes);
app.route('/ai', aiRoutes);
app.route('/feed', feedRoutes);
app.route('/cursos', cursoRoutes);
app.route('/lti', ltiRoutes);
app.route('/catalogo', catalogoRoutes);
app.route('/simulacoes', simulacaoRoutes);
app.route('/telemetria', telemetriaRoutes);
app.route('/tina', tinaRoutes);
app.route('/experiencias', experienciaRoutes);
app.route('/programas', programaRoutes);
app.route('/propostas', propostaRoutes);
app.route('/interactions', interactionRoutes);
app.route('/estudante', estudanteRoutes);
app.route('/ratings', ratingRoutes);
app.route('/comments', commentsRoutes);
app.route('/moderacao', moderacaoRoutes);
app.route('/admin', adminRoutes);
app.route('/comite', comiteRoutes);
app.route('/vinculos', vinculoRoutes);
app.route('/mensagens', mensagensRoutes);
app.route('/reputacao', reputationRoutes); // Rota Canónica (R2.T6)
app.route('/reputation', reputationRoutes); // Alias legacy
app.route('/seo', seoRoutes);
app.route('/conquistas', conquistaRoutes);
app.route('/mentorias', mentoriaRoutes);
app.route('/projetos', projetoRoutes);
app.route('/vocacional', vocacionalRoutes);
app.route('/media', mediaRoutes);
app.route('/notificacoes', notificacaoRoutes);
app.route('/perfis', perfilRoutes);
app.route('/denuncias', denunciaRoutes);
app.route('/feature-flags', featureFlagsRoutes);

const server = serve({
  fetch: app.fetch,
  port: parseInt(env.PORT),
}, (info) => {
  log.info({ port: info.port }, 'BFF Soberano Online');
});

// ─── INICIALIZAÇÕES ───
import { eventBus } from './modules/events/event-bus.js';
import { ltiHandler } from './modules/events/lti.handler.js';
import { conquistasHandler } from './modules/events/conquistas.handler.ts';
import { feedHandler } from './modules/events/feed.handler.js';
import { DomainEventName } from './modules/events/types.js';

// Registo explícito de handlers no Registry (D1)
eventBus.register(DomainEventName.TENTATIVA_CONCLUIDA, ltiHandler);
eventBus.register(DomainEventName.CURSO_PUBLICADO, feedHandler);
eventBus.register(DomainEventName.TENTATIVA_CONCLUIDA,    conquistasHandler);
eventBus.register(DomainEventName.CURSO_CONCLUIDO,        conquistasHandler);
eventBus.register(DomainEventName.VINCULO_CONNECTED,      conquistasHandler);
eventBus.register(DomainEventName.LOGIN,                  conquistasHandler);
eventBus.register(DomainEventName.MENTORIA_ACEITE,        conquistasHandler);
eventBus.register(DomainEventName.EXPERIENCIA_PUBLICADA,  conquistasHandler);
eventBus.register(DomainEventName.RATING_CRIADO,          conquistasHandler);
eventBus.register(DomainEventName.PERFIL_ATUALIZADO,      conquistasHandler);
eventBus.register(DomainEventName.SIMULACAO_CRIADA,       conquistasHandler);
eventBus.register(DomainEventName.CURSO_PUBLICADO,        conquistasHandler);
eventBus.register(DomainEventName.CURSO_INSCRICAO,        conquistasHandler);
eventBus.register(DomainEventName.COMENTARIO_CRIADO,      conquistasHandler);

socketService.init(server as Server);
tinaService.indexarKnowledge().catch((err: unknown) => { 
  log.error({ err }, 'Falha ao indexar Tina'); 
});

// ─── OUTBOX REPLAY SCHEDULER (ADR-007) ───
let outboxReplayTimer: ReturnType<typeof setInterval> | null = null;

if (process.env.NODE_ENV !== 'test') {
  const OUTBOX_REPLAY_INTERVAL_MS = parseInt(
    process.env.OUTBOX_REPLAY_INTERVAL_MS ?? '60000',
    10,
  );

  log.info({ intervalMs: OUTBOX_REPLAY_INTERVAL_MS }, 'Outbox Replay scheduler iniciado');

  outboxReplayTimer = setInterval(() => {
    replayUnprocessedEvents().catch((err: unknown) => {
      log.error({ err }, 'Erro inesperado no Outbox Replay scheduler');
    });
  }, OUTBOX_REPLAY_INTERVAL_MS);
}

// ─── GRACEFUL SHUTDOWN ───
const shutdown = (signal: string) => {
  log.info({ signal }, 'Sinal recebido — a encerrar servidor BFF');
  if (outboxReplayTimer !== null) {
    clearInterval(outboxReplayTimer);
    log.info('Outbox Replay scheduler parado');
  }
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export type AppType = typeof app;
