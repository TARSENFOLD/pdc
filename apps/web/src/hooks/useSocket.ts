import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = typeof import.meta.env.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL : 'http://localhost:3001';

interface UseSocketReturn {
  emitir: (event: string, data: unknown) => void;
  socket: Socket | null;
  connected: boolean;
}

export function useSocket(onMessage?: (msg: unknown) => void): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Inicializar socket com suporte a cookies httpOnly
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
    });
    socketRef.current.on('connect', () => { setConnected(true); });
    socketRef.current.on('disconnect', () => { setConnected(false); });

    if (onMessage) {
      socketRef.current.on('nova_mensagem', onMessage);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      setConnected(false);
    };
  }, [onMessage]);

  const emitir = (event: string, data: unknown) => {
    socketRef.current?.emit(event, data);
  };

  return { emitir, socket: socketRef.current, connected };
}
