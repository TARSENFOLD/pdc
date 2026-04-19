import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import pino from 'pino';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { socketService } from '../modules/realtime/socket.service.js';
import { persistirReputacao } from '../modules/reputation/reputation.service.js';

const log = pino({ name: 'routes:vinculos' });
type Vars = { Variables: AuthVariables };
export const vinculoRoutes = new Hono<Vars>();

vinculoRoutes.use('*', verifyJwt);

interface StrapiPerfilMini {
  id: string | number;
  nome: string;
  userId: string;
}

interface StrapiVinculo {
  id: string | number;
  solicitante: StrapiPerfilMini;
  destinatario: StrapiPerfilMini;
  status: string;
  criadoEm: string;
}

// GET /vinculos
vinculoRoutes.get('/', async (c) => {
  const { id: userId } = c.get('user');
  try {
    const res = await strapiGet<StrapiVinculo>('/vinculos', {
      'filters[$or][0][solicitante][userId][$eq]': userId,
      'filters[$or][1][destinatario][userId][$eq]': userId,
      'filters[status][$eq]': 'aprovado',
      populate: 'solicitante,destinatario'
    });
    return c.json({ data: res.data, meta: res.meta });
  } catch (err) {
    log.error({ err }, 'Erro ao carregar vínculos');
    return c.json({ error: 'Erro ao carregar vínculos' }, 502);
  }
});

// GET /vinculos/pendentes
vinculoRoutes.get('/pendentes', async (c) => {
  const { id: userId } = c.get('user');
  try {
    const res = await strapiGet<StrapiVinculo>('/vinculos', {
      'filters[destinatario][userId][$eq]': userId,
      'filters[status][$eq]': 'pendente',
      populate: 'solicitante'
    });
    return c.json({ data: res.data, meta: res.meta });
  } catch (err) {
    log.error({ err }, 'Erro ao carregar pedidos pendentes');
    return c.json({ error: 'Erro ao carregar pedidos pendentes' }, 502);
  }
});

// POST /vinculos/:id/pedir
vinculoRoutes.post('/:id/pedir', async (c) => {
  const destinatarioPerfilId = c.req.param('id');

  try {
    const solicitanteRes = await strapiGet<StrapiPerfilMini>('/perfis/me');
    const solicitantePerfil = solicitanteRes.data[0];

    if (!solicitantePerfil) {
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

    const resPost = await strapiPost<StrapiVinculo>('/vinculos', {
      solicitante: solicitantePerfil.id,
      destinatario: destinatarioPerfilId,
      status: 'pendente',
      criadoEm: new Date().toISOString()
    });

    const resDest = await strapiGet<StrapiPerfilMini>(`/perfis/${destinatarioPerfilId}`);
    const destinatario = resDest.data[0];
    
    if (destinatario) {
      socketService.emitirNotificacao(destinatario.userId, {
        id: crypto.randomUUID(),
        tipo: 'info',
        titulo: 'Novo Pedido de Vínculo',
        corpo: `${solicitantePerfil.nome} deseja conectar-se contigo.`,
        timestamp: new Date().toISOString()
      });
    }

    return c.json(resPost.data, 201);
  } catch (err) {
    log.error({ err }, 'Erro ao processar pedido de vínculo');
    return c.json({ error: 'Erro ao processar pedido de vínculo' }, 502);
  }
});

// PATCH /vinculos/:id/resolver
vinculoRoutes.patch('/:id/resolver', zValidator('json', z.object({ status: z.enum(['aprovado', 'rejeitado']) })), async (c) => {
  const vinculoId = c.req.param('id');
  const { status } = c.req.valid('json');
  const { id: userId } = c.get('user');

  try {
    const resExisting = await strapiGet<StrapiVinculo>(`/vinculos/${vinculoId}`, { populate: 'solicitante,destinatario' });
    const existing = resExisting.data[0];

    if (!existing) {
      return c.json({ error: 'Vínculo não encontrado' }, 404);
    }
    
    if (existing.destinatario.userId !== userId) {
      return c.json({ error: 'Não tens permissão para resolver este vínculo' }, 403);
    }

    const resPut = await strapiPut<StrapiVinculo>(`/vinculos/${vinculoId}`, { 
      status,
      resolvidoEm: new Date().toISOString()
    });

    if (status === 'aprovado') {
      void persistirReputacao(String(existing.solicitante.id));
      void persistirReputacao(String(existing.destinatario.id));

      socketService.emitirNotificacao(existing.solicitante.userId, {
        id: crypto.randomUUID(),
        tipo: 'sucesso',
        titulo: 'Vínculo Confirmado',
        corpo: `${existing.destinatario.nome} aceitou a tua ligação.`,
        timestamp: new Date().toISOString()
      });
    }

    return c.json(resPut.data);
  } catch (err) {
    log.error({ err }, 'Erro ao resolver vínculo');
    return c.json({ error: 'Erro ao resolver vínculo' }, 502);
  }
});
