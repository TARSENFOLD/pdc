import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = typeof import.meta.env.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL : 'http://localhost:3001';

export function useSocket(onMessage?: (msg: unknown) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Inicializar socket com suporte a cookies httpOnly
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
    });

    if (onMessage) {
      socketRef.current.on('nova_mensagem', onMessage);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [onMessage]);

  const emitir = (event: string, data: unknown) => {
    socketRef.current?.emit(event, data);
  };

  return { emitir, socket: socketRef.current };
}
