import { Hono } from 'hono';
import { dashboardEstudanteRoutes } from './estudante.js';
import { dashboardMentorRoutes } from './mentor.js';
import { dashboardModeradorRoutes } from './moderador.js';

export const dashboardRoutes = new Hono();

dashboardRoutes.route('/estudante', dashboardEstudanteRoutes);
dashboardRoutes.route('/mentor', dashboardMentorRoutes);
dashboardRoutes.route('/moderador', dashboardModeradorRoutes);
