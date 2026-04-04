import { io, type Socket } from 'socket.io-client';

const URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

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

export function on(event: string, handler: (data: unknown) => void) {
  socket.on(event, handler as (...args: unknown[]) => void);
}

export function off(event: string, handler: (data: unknown) => void) {
  socket.off(event, handler as (...args: unknown[]) => void);
}

export function emit(event: string, data?: unknown) {
  socket.emit(event, data);
}
