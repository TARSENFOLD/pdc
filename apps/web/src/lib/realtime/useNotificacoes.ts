import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { useToast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import type { NotificacaoRealtime } from '@pdc/shared';
import type { ToastVariant } from '@/components/ui/Toast';

const VARIANT_MAP: Record<NotificacaoRealtime['tipo'], ToastVariant> = {
  info: 'info',
  sucesso: 'success',
  aviso: 'warning',
  erro: 'error',
  vinculo_pedido: 'info',
  vinculo_aprovado: 'success',
  vinculo_rejeitado: 'warning',
  vinculo_terminado: 'default',
  conquista: 'success',
  sistema: 'default',
  aprovacao: 'success',
  rejeicao: 'error',
};

export function useNotificacoes() {
  const { on } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const cleanup = on<NotificacaoRealtime>('notificacao', (notif) => {
      toast({
        title: notif.titulo,
        description: notif.mensagem,
        variant: VARIANT_MAP[notif.tipo],
      });
      void queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    });
    return cleanup;
  }, [on, toast, queryClient]);

  useEffect(() => {
    const cleanup = on<{ slug: string; titulo: string; descricao: string }>('conquista_desbloqueada', (conquista) => {
      toast({
        title: `🏆 Conquista Desbloqueada: ${conquista.titulo}`,
        description: conquista.descricao,
        variant: 'success',
      });
      // Invalidate relevant queries to update UI
      void queryClient.invalidateQueries({ queryKey: ['conquistas', 'minhas'] });
      void queryClient.invalidateQueries({ queryKey: ['perfis', 'me'] });
    });
    return cleanup;
  }, [on, toast, queryClient]);
}
