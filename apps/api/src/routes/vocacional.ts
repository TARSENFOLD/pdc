import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { vocacionalService } from '../modules/vocacional/vocacional.service.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };
export const vocacionalRoutes = new Hono<Vars>();

vocacionalRoutes.use('*', verifyJwt);

vocacionalRoutes.get('/perfil-premium', async (c) => {
  const user = c.get('user');
  try {
    // 1. Buscar Perfil real para ID
    const resPerfil = await strapiGet<any>('/perfis', {
      'filters[userId][$eq]': user.id,
    });
    const perfil = resPerfil.data[0];
    if (!perfil) return c.json({ error: 'Identidade vocacional não localizada' }, 404);

    // 2. Buscar padrões comportamentais reais (phi e R)
    const patternsRes = await strapiGet<any>('/behavior-patterns', {
      'filters[perfil][id][$eq]': perfil.id,
      'sort': 'lastUpdatedAt:desc'
    });

    // 3. Gerar recomendações dinâmicas baseadas no músculo
    const scoreCalculado = perfil.xp ? Math.min(100, Math.floor(perfil.xp / 100)) : 75;
    const recomendacoes = await vocacionalService.gerarRecomendacoes({ scoreGlobal: scoreCalculado } as any);
    
    return c.json({
      scoreGlobal: scoreCalculado,
      patterns: patternsRes.data || [],
      recomendacoes,
      lastUpdate: perfil.updatedAt
    });
  } catch (err) {
    console.error('[VOCACIONAL_PREMIUM_ERROR]', err);
    return c.json({ error: 'Erro ao processar o Oráculo de Elite' }, 502);
  }
});

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
    return c.json({ error: 'Erro ao calcular perfil básico' }, 502);
  }
});