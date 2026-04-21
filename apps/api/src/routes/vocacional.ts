import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { vocacionalService } from '../modules/vocacional/vocacional.service.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';

import { 
  PerfilCompleto, 
  BehaviorPattern 
} from '@pdc/shared';

type Vars = { Variables: AuthVariables };
export const vocacionalRoutes = new Hono<Vars>();

vocacionalRoutes.use('*', verifyJwt);

vocacionalRoutes.get('/perfil-premium', async (c) => {
  const user = c.get('user');
  try {
    const resPerfil = await strapiGet<PerfilCompleto>('/perfis', {
      'filters[userId][$eq]': user.id,
    });
    const perfil = resPerfil.data[0];
    if (!perfil) return c.json({ error: 'Identidade vocacional não localizada' }, 404);

    // 2. Buscar padrões comportamentais reais (phi e R)
    const patternsRes = await strapiGet<BehaviorPattern>('/behavior-patterns', {
      'filters[perfil][id][$eq]': perfil.id,
      'sort': 'lastUpdatedAt:desc'
    });

    // 3. Gerar recomendações dinâmicas baseadas no músculo
    // 3. Gerar recomendações dinâmicas baseadas no músculo real
    const realPerfil = await vocacionalService.calcularPerfil(user.id);
    const recomendacoes = await vocacionalService.gerarRecomendacoes(realPerfil);
    
    return c.json({
      scoreGlobal: realPerfil.scoreGlobal,
      patterns: patternsRes.data,
      recomendacoes,
      lastUpdate: realPerfil.updatedAt
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
  } catch {
    return c.json({ error: 'Erro ao calcular perfil básico' }, 502);
  }
});