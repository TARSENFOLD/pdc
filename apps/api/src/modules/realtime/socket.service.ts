import { Server } from 'socket.io';
import { jwtVerify } from 'jose';
import pino from 'pino';
import type { Server as HttpServer } from 'node:http';
import { strapiPost } from '../strapi/strapi.client.js';
import type { NotificacaoRealtime } from '@pdc/shared';
import { env } from '../../lib/env.js';

const log = pino({ name: 'socket-service' });
const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

let io: Server | undefined;

export const socketService = {
  init(httpServer: HttpServer): void {
    io = new Server(httpServer, {
      cors: {
        origin: [env.FRONTEND_URL, 'http://localhost:5173'],
        credentials: true,
        methods: ['GET', 'POST'],
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    io.use(async (socket, next) => {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) { next(); return; }

      const token = cookieHeader
        .split(';')
        .find((c) => c.trim().startsWith('access_token='))
        ?.split('=')[1];

      if (!token) { next(); return; }

      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        (socket.data as Record<string, unknown>).userId = payload.sub as string;
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });

    io.on('connection', (socket) => {
      const userId = (socket.data as Record<string, unknown>).userId as string | undefined;
      if (userId) void socket.join(`user:${userId}`);

      socket.on('mensagem:enviar', async (payload: { destinatarioId: string; conteudo: string }) => {
        if (!userId) return;
        try {
          const res = await strapiPost<{ data: { id: number } }>('/mensagens', {
            remetenteId: userId,
            destinatarioId: payload.destinatarioId,
            conteudo: payload.conteudo,
            lida: false,
            createdAt: new Date().toISOString(),
          });

          socketService.emitirMensagem(payload.destinatarioId, {
            id: res.data.id.toString(),
            remetenteId: userId,
            conteudo: payload.conteudo,
            createdAt: new Date().toISOString(),
          });
        } catch (err) {
          log.error({ err }, 'Erro ao guardar mensagem no Strapi');
        }
      });
    });
  },

  emitirLandingPulse(area: string | undefined, count: number): void {
    if (!io) return;
    io.emit('landing:pulse', { count, ...(area ? { area } : {}) });
  },

  emitirNotificacao(userId: string, notificacao: NotificacaoRealtime): void {
    if (!io) return;
    io.to(`user:${userId}`).emit('notificacao', notificacao);
  },

  emitirMensagem(userId: string, mensagem: unknown): void {
    if (!io) return;
    io.to(`user:${userId}`).emit('nova_mensagem', mensagem);
  },
};
