import { Hono } from 'hono';
import pino from 'pino';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { vocacionalService } from '../modules/vocacional/vocacional.service.js';
import { vocacionalSnapshotService } from '../modules/vocacional/vocacional.snapshot.service.js';

const log = pino({ name: 'vocacional' });

type Vars = { Variables: AuthVariables };
export const vocacionalRoutes = new Hono<Vars>();

vocacionalRoutes.use('*', verifyJwt);

vocacionalRoutes.post('/gerar', async (c) => {
  const user = c.get('user');
  try {
    const snapshot = await vocacionalSnapshotService.gerar(user.id);
    return c.json(snapshot, 201);
  } catch (err) {
    log.error({ err, userId: user.id }, 'Erro ao gerar snapshot vocacional');
    return c.json({ error: 'Erro ao processar o Oráculo de Elite' }, 502);
  }
});

vocacionalRoutes.get('/atual', async (c) => {
  const user = c.get('user');
  try {
    const snapshot = await vocacionalSnapshotService.getAtual(user.id);
    if (!snapshot) return c.json({ error: 'Perfil vocacional ainda não gerado' }, 404);
    return c.json(snapshot);
  } catch (err) {
    log.error({ err, userId: user.id }, 'Erro ao ler snapshot vocacional atual');
    return c.json({ error: 'Erro ao carregar perfil vocacional atual' }, 502);
  }
});

vocacionalRoutes.get('/perfil-premium', async (c) => {
  const user = c.get('user');
  try {
    const snapshot = await vocacionalSnapshotService.getAtual(user.id);
    if (!snapshot) return c.json({ error: 'Perfil vocacional ainda não gerado' }, 404);
    return c.json(snapshot);
  } catch (err) {
    log.error({ err, userId: user.id }, 'Erro ao processar Oráculo de Elite');
    return c.json({ error: 'Erro ao processar o Oráculo de Elite' }, 502);
  }
});

vocacionalRoutes.get('/perfil', async (c) => {
  const user = c.get('user');
  try {
    const perfil = await vocacionalService.calcularPerfil(user.id);
    const recomendacoes = await vocacionalService.gerarRecomendacoes(perfil);
    return c.json({ perfil, recomendacoes });
  } catch {
    return c.json({ error: 'Erro ao calcular perfil básico' }, 502);
  }
});
