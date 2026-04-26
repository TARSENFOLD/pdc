import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

export function useSocket<T = unknown>(onMessage?: (msg: T) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Inicializar socket com suporte a cookies httpOnly
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
    });

    if (onMessage) {
      socketRef.current.on('nova_mensagem', onMessage as (args: any) => void);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [onMessage]);

  const emitir = (event: string, data: any) => {
    socketRef.current?.emit(event, data);
  };

  return { emitir, socket: socketRef.current };
}
