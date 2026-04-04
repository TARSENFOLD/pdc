import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { authRoutes } from './routes/auth.js';
import { perfilRoutes } from './routes/perfis.js';
import { cursoRoutes } from './routes/cursos.js';
import { simulacaoRoutes } from './routes/simulacoes.js';
import { experienciaRoutes } from './routes/experiencias.js';
import { notificacaoRoutes } from './routes/notificacoes.js';
import { mediaRoutes } from './routes/media.js';
import { telemetriaRoutes } from './routes/telemetria.js';
import { vocacionalRoutes } from './routes/vocacional.js';
import { projetoRoutes } from './routes/projetos.js';
import { mentoriaRoutes } from './routes/mentorias.js';
import { conquistaRoutes } from './routes/conquistas.js';
import { denunciaRoutes } from './routes/denuncias.js';
import { adminRoutes } from './routes/admin.js';
import { ltiRoutes } from './routes/lti.js';
import { securityMiddleware } from './middleware/security.js';

const app = new Hono();

// ─── Middleware global ────────────────────────────────────────────────────────
app.use('*', logger());
app.use('*', securityMiddleware);
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use('*', secureHeaders());

// ─── Rotas ────────────────────────────────────────────────────────────────────
app.route('/auth', authRoutes);
app.route('/perfis', perfilRoutes);
app.route('/cursos', cursoRoutes);
app.route('/simulacoes', simulacaoRoutes);
app.route('/experiencias', experienciaRoutes);
app.route('/notificacoes', notificacaoRoutes);
app.route('/media', mediaRoutes);
app.route('/telemetria', telemetriaRoutes);
app.route('/vocacional', vocacionalRoutes);
app.route('/projetos', projetoRoutes);
app.route('/mentorias', mentoriaRoutes);
app.route('/conquistas', conquistaRoutes);
app.route('/denuncias', denunciaRoutes);
app.route('/admin', adminRoutes);
app.route('/lti', ltiRoutes);

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Servidor ─────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 3001);

serve(
  {
    fetch: app.fetch,
    port,
  },
  () => {
    console.warn(`BFF running on http://localhost:${port.toString()}`);
  }
);

export type AppType = typeof app;
