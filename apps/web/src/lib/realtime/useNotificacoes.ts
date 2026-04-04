import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { useToast } from '@/hooks/useToast';
import type { NotificacaoRealtime } from '@pdc/shared';
import type { ToastVariant } from '@/components/ui/Toast';

const VARIANT_MAP: Record<NotificacaoRealtime['tipo'], ToastVariant> = {
  info: 'info',
  sucesso: 'success',
  aviso: 'warning',
  erro: 'error',
};

export function useNotificacoes() {
  const { on } = useSocket();
  const { toast } = useToast();

  useEffect(() => {
    const cleanup = on<NotificacaoRealtime>('notificacao', (notif) => {
      toast({
        title: notif.titulo,
        description: notif.corpo,
        variant: VARIANT_MAP[notif.tipo],
      });
    });
    return cleanup;
  }, [on, toast]);
}
