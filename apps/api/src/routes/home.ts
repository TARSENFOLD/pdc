import { Hono } from 'hono';

export const homeRoutes = new Hono();

homeRoutes.get('/', (c) => {
  return c.json({
    greeting: 'Olá',
    personalizedMessage: 'Bem-vindo',
    stats: {
      reputacao: 100,
      xp: 0,
      pendingActions: 0,
    },
    nextDirective: null,
    socialPulse: [],
    quickActions: [],
  });
});
