import { io, type Socket } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const socket: Socket = io(URL, {
  withCredentials: true,
  autoConnect: false,
});

export function connect() {
  if (!socket.connected) socket.connect();
}

export function disconnect() {
  if (socket.connected) socket.disconnect();
}

export function on<T>(event: string, handler: (data: T) => void) {
  socket.on(event, handler as (...args: unknown[]) => void);
}

export function off<T>(event: string, handler: (data: T) => void) {
  socket.off(event, handler as (...args: unknown[]) => void);
}

export function emit<T>(event: string, data?: T) {
  socket.emit(event, data);
}
