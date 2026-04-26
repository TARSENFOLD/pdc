import { Server } from 'socket.io';
import { jwtVerify } from 'jose';
import type { Server as HttpServer } from 'node:http';
import type { NotificacaoRealtime } from '@pdc/shared';
import { env } from '../../lib/env.js';

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

      // Mutações de estado devem fluir via API HTTP (Outbox G15).
      // O Socket.IO é reservado estritamente como canal de Emissão (One-Way Data Flow).
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

  emitirConquista(userId: string, conquista: { slug: string; titulo: string; descricao: string }): void {
    if (!io) return;
    io.to(`user:${userId}`).emit('conquista_desbloqueada', conquista);
  },
};
