import { useEffect, useRef, useCallback } from 'react';
import { connect, disconnect, on, off } from './socket.client';

export function useSocket() {
  const cleanups = useRef<Array<() => void>>([]);

  useEffect(() => {
    connect();
    return () => {
      cleanups.current.forEach((fn) => fn());
      cleanups.current = [];
      disconnect();
    };
  }, []);

  const listen = useCallback(<T,>(event: string, handler: (data: T) => void) => {
    on(event, handler);
    const cleanup = () => off(event, handler);
    cleanups.current.push(cleanup);
    return cleanup;
  }, []);

  return { on: listen };
}
