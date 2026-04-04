import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { vocacionalService } from '../modules/vocacional/vocacional.service.js';

type Vars = { Variables: AuthVariables };
export const vocacionalRoutes = new Hono<Vars>();

vocacionalRoutes.use('*', verifyJwt);

vocacionalRoutes.get('/perfil', async (c) => {
  const user = c.get('user');
  try {
    const perfil = await vocacionalService.calcularPerfil(user.id);
    const recomendacoes = await vocacionalService.gerarRecomendacoes(perfil);
    
    return c.json({
      perfil,
      recomendacoes,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});
