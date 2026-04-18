import { Hono } from 'hono';
import { strapiGet, strapiPut } from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';

type Vars = { Variables: AuthVariables };
export const perfilRoutes = new Hono<Vars>();

/**
 * Filtro Soberano de Privacidade (Wave 4)
 * Define o que cada viewer pode ver de um perfil.
 */
function filtrarPerfilPorPrivacidade(perfil: any, viewerId: string, viewerRole: string) {
  const isOwner = perfil.userId === viewerId;
  const isAdmin = ['moderador', 'super_admin'].includes(viewerRole);
  const settings = perfil.visibilitySettings || {};

  const publicFields = ['id', 'nome', 'tipo', 'headline', 'bio', 'foto', 'areaFormacao', 'reputacao'];
  
  if (isOwner || isAdmin) return perfil;

  // Filtragem baseada em configurações de privacidade
  const filtered: any = {};
  publicFields.forEach(f => { filtered[f] = perfil[f]; });

  // Campos condicionais
  if (settings.conquistas === 'publico') filtered.conquistas = perfil.conquistas;
  if (settings.votos === 'publico') filtered.votos = perfil.votos;

  // Dados sensíveis (Sempre removidos para terceiros)
  delete filtered.email;
  delete filtered.telefone;
  delete filtered.documentos;

  return filtered;
}

perfilRoutes.use('*', verifyJwt);

// GET /perfis/me — Dashboard Privado (Full Access)
perfilRoutes.get('/me', async (c) => {
  try {
    const data = await strapiGet<any>('/perfis/me', { populate: 'foto,conquistas' });
    return c.json(data.data);
  } catch (err) {
    return c.json({ error: 'Erro ao carregar perfil privado' }, 502);
  }
});

// GET /perfis/:id — Perfil Público (Filtered)
perfilRoutes.get('/:id', async (c) => {
  const targetId = c.req.param('id');
  const { id: viewerId, role: viewerRole } = c.get('user');
  
  try {
    const data = await strapiGet<any>(`/perfis/${targetId}`, { populate: 'foto,conquistas' });
    const filtered = filtrarPerfilPorPrivacidade(data.data, viewerId, viewerRole);
    return c.json(filtered);
  } catch (err) {
    return c.json({ error: 'Perfil não encontrado' }, 404);
  }
});

// PUT /perfis/me — Actualizar dados e definições
perfilRoutes.put('/me', async (c) => {
  const body = await c.req.json();

  try {
    const perfil = await strapiGet<{ data: any }>('/perfis/me');
    const result = await strapiPut<any>(`/perfis/${perfil.data.id}`, body as Record<string, any>);
    return c.json(result);
  } catch (err) {
    return c.json({ error: 'Erro ao atualizar perfil' }, 502);
  }
});
