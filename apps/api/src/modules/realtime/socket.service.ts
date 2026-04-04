import { Server } from 'socket.io';
import { jwtVerify } from 'jose';
import type { Server as HttpServer } from 'node:http';
import { strapiPost } from '../strapi/strapi.client.js';
import type { NotificacaoRealtime } from '@pdc/shared';

const JWT_SECRET = new TextEncoder().encode(
  process.env['JWT_SECRET'] || 'change-me-in-production-min-32-chars'
);

let io: Server;

export const socketService = {
  init(httpServer: HttpServer): void {
    io = new Server(httpServer, {
      cors: {
        origin: process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
        credentials: true,
      },
    });

    io.use(async (socket, next) => {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) return next(new Error('Unauthorized'));

      const token = cookieHeader
        .split(';')
        .find((c) => c.trim().startsWith('access_token='))
        ?.split('=')[1];

      if (!token) return next(new Error('Unauthorized'));

      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        socket.data.userId = payload.sub as string;
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });

    io.on('connection', (socket) => {
      const userId = socket.data.userId as string;
      socket.join(`user:${userId}`);

      socket.on('mensagem:enviar', async (payload: { destinatarioId: string; conteudo: string }) => {
        try {
          const res = await strapiPost<{ data: { id: number; attributes: Record<string, unknown> } }>('/mensagens', {
            remetenteId: userId,
            destinatarioId: payload.destinatarioId,
            conteudo: payload.conteudo,
            lida: false,
            createdAt: new Date().toISOString(),
          });

          this.emitirMensagem(payload.destinatarioId, {
            id: res.data.id.toString(),
            remetenteId: userId,
            conteudo: payload.conteudo,
            createdAt: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Erro ao guardar mensagem no Strapi:', err);
        }
      });
    });
  },

  emitirNotificacao(userId: string, notificacao: NotificacaoRealtime): void {
    if (!io) return;
    io.to(`user:${userId}`).emit('notificacao', notificacao);
  },

  emitirMensagem(userId: string, mensagem: unknown): void {
    if (!io) return;
    io.to(`user:${userId}`).emit('mensagem', mensagem);
  },
};
