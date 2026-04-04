import { useEffect, useRef, useCallback } from 'react';
import { connect, disconnect, on, off } from './socket.client';

export function useSocket() {
  const cleanups = useRef<Array<() => void>>([]);

  useEffect(() => {
    connect();
    return () => {
      cleanups.current.forEach((fn) => { fn(); });
      cleanups.current = [];
      disconnect();
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- T narrows the callback data for callers
  const listen = useCallback(<T>(event: string, handler: (data: T) => void) => {
    on(event, handler as (data: unknown) => void);
    const cleanup = () => { off(event, handler as (data: unknown) => void); };
    cleanups.current.push(cleanup);
    return cleanup;
  }, []);

  return { on: listen };
}
