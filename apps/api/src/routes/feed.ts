import { Hono } from 'hono';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';

type Vars = { Variables: AuthVariables };
export const feedRoutes = new Hono<Vars>();

feedRoutes.use('*', verifyJwt);

/**
 * GET /feed
 * O Pulso Soberano: Unifica Posts, Conquistas e Destaques Vocacionais.
 */
feedRoutes.get('/', async (c) => {
  try {
    const perfil = await strapiGet<{ data: any }>('/perfis/me');
    const areaInteresse = perfil.data.areasInteresse?.[0] || '';

    // 1. Buscar Posts (Geral)
    const posts = await strapiGet<any>('/posts', {
      populate: 'autor,capa',
      'sort': 'createdAt:desc',
      'pagination[limit]': '10'
    });

    // 2. Buscar Conquistas Recentes (Log de Prestígio)
    const conquistas = await strapiGet<any>('/conquista-utilizadors', {
      populate: 'perfil,conquista',
      'sort': 'createdAt:desc',
      'pagination[limit]': '10'
    });

    // Consolidar e Transformar para o formato Unificado
    const feedItems = [
      ...posts.data.map((p: any) => ({
        id: `post-${p.id}`,
        tipo: 'post',
        titulo: p.titulo,
        corpo: p.descricao,
        autor: p.autor?.nome || 'PDC',
        avatar: p.autor?.foto?.url,
        imagem: p.capa?.url,
        createdAt: p.createdAt
      })),
      ...conquistas.data.map((c: any) => ({
        id: `conq-${c.id}`,
        tipo: 'conquista',
        titulo: `${c.perfil?.nome} desbloqueou uma conquista!`,
        corpo: c.conquista?.titulo || 'Mérito alcançado',
        autor: 'PDC Achievement Engine',
        avatar: null,
        imagem: c.conquista?.icone?.url,
        createdAt: c.createdAt
      }))
    ];

    const sortedFeed = feedItems.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return c.json({ data: sortedFeed, metadata: { areaInteresse } });
  } catch (err) {
    return c.json({ error: 'Erro ao processar pulso social' }, 502);
  }
});
