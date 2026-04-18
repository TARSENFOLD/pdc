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

// GET /vinculos
vinculoRoutes.get('/', async (c) => {
  const { id: userId } = c.get('user');
  try {
    const data = await strapiGet<any>('/vinculos', {
      'filters[$or][0][solicitante][userId][$eq]': userId,
      'filters[$or][1][destinatario][userId][$eq]': userId,
      'filters[status][$eq]': 'aprovado',
      populate: 'solicitante,destinatario'
    });
    return c.json(data);
  } catch (err) {
    log.error({ err }, 'Erro ao carregar vínculos');
    return c.json({ error: 'Erro ao carregar vínculos' }, 502);
  }
});

// GET /vinculos/pendentes
vinculoRoutes.get('/pendentes', async (c) => {
  const { id: userId } = c.get('user');
  try {
    const data = await strapiGet<any>('/vinculos', {
      'filters[destinatario][userId][$eq]': userId,
      'filters[status][$eq]': 'pendente',
      populate: 'solicitante'
    });
    return c.json(data);
  } catch (err) {
    log.error({ err }, 'Erro ao carregar pedidos pendentes');
    return c.json({ error: 'Erro ao carregar pedidos pendentes' }, 502);
  }
});

// POST /vinculos/:id/pedir
vinculoRoutes.post('/:id/pedir', async (c) => {
  const destinatarioPerfilId = c.req.param('id');

  try {
    const solicitanteRes = await strapiGet<{ data: any }>('/perfis/me');
    const solicitantePerfil = solicitanteRes.data;

    const result = await strapiPost<any>('/vinculos', {
      solicitante: solicitantePerfil.id,
      destinatario: destinatarioPerfilId,
      status: 'pendente',
      criadoEm: new Date().toISOString()
    });

    const destinatario = await strapiGet<{ data: any }>(`/perfis/${destinatarioPerfilId}`);
    socketService.emitirNotificacao(destinatario.data.userId, {
      id: crypto.randomUUID(),
      tipo: 'info',
      titulo: 'Novo Pedido de Vínculo',
      corpo: `${solicitantePerfil.nome} deseja conectar-se contigo.`,
      timestamp: new Date().toISOString()
    });

    return c.json(result, 201);
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
    const existing = await strapiGet<any>(`/vinculos/${vinculoId}`, { populate: 'solicitante,destinatario' });
    
    if (existing.data.destinatario.userId !== userId) {
      return c.json({ error: 'Não tens permissão para resolver este vínculo' }, 403);
    }

    const result = await strapiPut<any>(`/vinculos/${vinculoId}`, { 
      status,
      resolvidoEm: new Date().toISOString()
    });

    if (status === 'aprovado') {
      void persistirReputacao(String(existing.data.solicitante.id));
      void persistirReputacao(String(existing.data.destinatario.id));

      socketService.emitirNotificacao(existing.data.solicitante.userId, {
        id: crypto.randomUUID(),
        tipo: 'sucesso',
        titulo: 'Vínculo Confirmado',
        corpo: `${existing.data.destinatario.nome} aceitou a tua ligação.`,
        timestamp: new Date().toISOString()
      });
    }

    return c.json(result);
  } catch (err) {
    log.error({ err }, 'Erro ao resolver vínculo');
    return c.json({ error: 'Erro ao resolver vínculo' }, 502);
  }
});
