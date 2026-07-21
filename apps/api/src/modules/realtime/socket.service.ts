import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import type { NotificacaoRealtime } from '@pdc/shared';
import { env } from '../../lib/env.js';
import { verifyAccessJwt } from '../auth/auth.middleware.js';
import { ACCESS_TOKEN_COOKIE } from '../auth/auth.constants.js';

type NoInboundEvents = Record<string, (...args: never[]) => void>;

interface ServerToClientEvents {
  'landing:pulse': (payload: { count: number; area?: string }) => void;
  notificacao: (notificacao: NotificacaoRealtime) => void;
  nova_mensagem: (mensagem: unknown) => void;
  conquista_desbloqueada: (conquista: { slug: string; titulo: string; descricao: string }) => void;
}

interface SocketData {
  userId?: string;
}

type PdcSocketServer = Server<
  NoInboundEvents,
  ServerToClientEvents,
  NoInboundEvents,
  SocketData
>;

let io: PdcSocketServer | undefined;

export const socketService = {
  init(httpServer: HttpServer): void {
    io = new Server<NoInboundEvents, ServerToClientEvents, NoInboundEvents, SocketData>(httpServer, {
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
        .find((c) => c.trim().startsWith(`${ACCESS_TOKEN_COOKIE}=`))
        ?.split('=')[1];

      if (!token) { next(); return; }

      try {
        const payload = await verifyAccessJwt(token);
        if (!payload) throw new Error('Unauthorized');
        socket.data.userId = payload.sub;
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });

    io.on('connection', (socket) => {
      const userId = typeof socket.data.userId === 'string' ? socket.data.userId : undefined;
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

  close(): Promise<void> {
    if (!io) return Promise.resolve();

    const currentIo = io;
    io = undefined;
    return currentIo.close();
  },
};
