import { Hono } from 'hono';
import pino from 'pino';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { vocacionalService } from '../modules/vocacional/vocacional.service.js';
import { strapiGet, strapiPost } from '../modules/strapi/strapi.client.js';

import {
  type PerfilCompleto,
  type BehaviorPattern
} from '@pdc/shared';

const log = pino({ name: 'vocacional' });

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

    const patternsRes = await strapiGet<BehaviorPattern>('/behavior-patterns', {
      'filters[perfil][id][$eq]': perfil.id,
      'sort': 'lastUpdatedAt:desc'
    });

    // 3. Calcular perfil e gerar recomendações
    const realPerfil = await vocacionalService.calcularPerfil(user.id);
    const recomendacoes = await vocacionalService.gerarRecomendacoes(realPerfil);

    // 4. Persistir resultado no Strapi (perfil-vocacionais) para feeds downstream
    try {
      await strapiPost('/perfil-vocacionais', {
        data: {
          perfil: perfil.id,
          scoreGlobal: realPerfil.scoreGlobal,
          certeza: realPerfil.certeza,
          totalEventos: realPerfil.totalEventos,
          areaMatch: realPerfil.areaMatch,
          aptidao: realPerfil.aptidao,
          dedicacao: realPerfil.dedicacao,
          dimensoes: realPerfil.dimensoes,
        },
      });
    } catch (persistErr) {
      log.warn({ err: persistErr, userId: user.id }, 'Falha ao persistir perfil vocacional no Strapi');
    }

    return c.json({
      scoreGlobal: realPerfil.scoreGlobal,
      certeza: realPerfil.certeza,
      totalEventos: realPerfil.totalEventos,
      patterns: patternsRes.data,
      recomendacoes,
      lastUpdate: realPerfil.updatedAt
    });
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
    
    return c.json({
      perfil,
      recomendacoes,
    });
  } catch {
    return c.json({ error: 'Erro ao calcular perfil básico' }, 502);
  }
});
