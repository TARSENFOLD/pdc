import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { VinculoTipo, VinculoStatus } from '@pdc/shared';
import { Button } from './Button';
import { http } from '@/lib/api/http';

export interface ConectarButtonProps {
  targetId: string;
  connectionType: VinculoTipo;
  onConnected?: () => void;
}

export function ConectarButton({ targetId, connectionType, onConnected }: ConectarButtonProps) {
  const [status, setStatus] = useState<VinculoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await http.get<VinculoStatus>(`/vinculos/status?targetId=${targetId}`);
        setStatus(data);
      } catch (err) {
        console.error('Erro ao buscar status:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [targetId]);

  // Criar vínculo
  const criarMutation = useMutation({
    mutationFn: async () => {
      return http.post(`/vinculos`, { receiverId: targetId, connectionType });
    },
    onSuccess: () => {
      setStatus({ estado: 'pending', vinculoId: null, isSender: true });
      void qc.invalidateQueries({ queryKey: ['vinculos'] });
      onConnected?.();
    },
  });

  // Aceitar/Rejeitar
  const aceitarRejeitar = useMutation({
    mutationFn: async (acao: 'aceitar' | 'rejeitar') => {
      return http.patch(`/vinculos/${status?.vinculoId}`, { acao });
    },
    onSuccess: (_, acao) => {
      setStatus((prev: VinculoStatus | null) => prev ? { ...prev, estado: acao === 'aceitar' ? 'connected' : 'declined' } : null);
      void qc.invalidateQueries({ queryKey: ['vinculos'] });
      onConnected?.();
    },
  });

  if (loading) {
    return <Button variant="ghost" disabled>Carregando...</Button>;
  }

  // Estado: null → sem vínculo
  if (status?.estado === null) {
    return (
      <Button
        variant="primary"
        size="sm"
        onClick={() => { criarMutation.mutate(); }}
        disabled={criarMutation.isPending}
      >
        + Conectar
      </Button>
    );
  }

  // Estado: pending, sender = true → pedido enviado
  if (status?.estado === 'pending' && status.isSender) {
    return (
      <Button variant="ghost" size="sm" disabled className="text-text-muted">
        ⏳ Pendente
      </Button>
    );
  }

  // Estado: pending, receiver = true → botões aceitar/recusar
  if (status?.estado === 'pending' && !status.isSender) {
    return (
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => { aceitarRejeitar.mutate('aceitar'); }}
          disabled={aceitarRejeitar.isPending}
        >
          ✓ Aceitar
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { aceitarRejeitar.mutate('rejeitar'); }}
          disabled={aceitarRejeitar.isPending}
        >
          ✕ Recusar
        </Button>
      </div>
    );
  }

  // Estado: connected
  if (status?.estado === 'connected') {
    return (
      <Button variant="ghost" size="sm" disabled className="text-success">
        ✓ Conectado
      </Button>
    );
  }

  return null;
}

