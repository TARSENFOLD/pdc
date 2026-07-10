import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { VinculoTipo, VinculoStatus } from '@pdc/shared';
import { Button } from './Button';
import { http } from '@/lib/api/http';
import { vinculosApi } from '@/lib/api/vinculos';

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
    void fetchStatus().catch((err: unknown) => {
        console.error('Erro ao buscar status:', err);
    });
  }, [targetId]);

  // Criar vínculo
  const criarMutation = useMutation({
    mutationFn: () => vinculosApi.criar(targetId, connectionType),
    onSuccess: () => {
      setStatus({ status: 'pendente', vinculoId: null, isSender: true });
      void qc.invalidateQueries({ queryKey: ['vinculos'] });
      onConnected?.();
    },
  });

  // Aceitar/Rejeitar
  const aceitarRejeitar = useMutation({
    mutationFn: async (acao: 'aceitar' | 'rejeitar') => {
      const vinculoId = status?.vinculoId;
      if (!vinculoId) throw new Error('Pedido de vínculo inválido.');
      return vinculosApi.aceitarRejeitar(vinculoId, acao);
    },
    onSuccess: (_, acao) => {
      setStatus((prev: VinculoStatus | null) => prev ? { ...prev, status: acao === 'aceitar' ? 'aprovado' : 'rejeitado' } : null);
      void qc.invalidateQueries({ queryKey: ['vinculos'] });
      onConnected?.();
    },
  });

  if (loading) {
    return <Button variant="ghost" disabled>Carregando...</Button>;
  }

  // Estado: null → sem vínculo
  if (status?.status === null) {
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
  if (status?.status === 'pendente' && status.isSender) {
    return (
      <Button variant="ghost" size="sm" disabled className="text-ink-tertiary">
        ⏳ Pendente
      </Button>
    );
  }

  // Estado: pending, receiver = true → botões aceitar/recusar
  if (status?.status === 'pendente' && !status.isSender) {
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
  if (status?.status === 'aprovado') {
    return (
      <Button variant="ghost" size="sm" disabled className="text-success">
        ✓ Conectado
      </Button>
    );
  }

  // Estado: rejeitado
  if (status?.status === 'rejeitado') {
    return (
      <Button variant="ghost" size="sm" disabled className="text-ink-tertiary">
        ✕ Recusado
      </Button>
    );
  }

  return null;
}

