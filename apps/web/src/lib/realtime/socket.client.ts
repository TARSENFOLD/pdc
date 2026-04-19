import { io, type Socket } from 'socket.io-client';

// In dev, Vite proxies /socket.io → localhost:3001/socket.io
// In prod, VITE_API_URL points to the real API domain
const URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

const socket: Socket = io(URL, {
  withCredentials: true,
  autoConnect: false,
  path: '/socket.io',
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
