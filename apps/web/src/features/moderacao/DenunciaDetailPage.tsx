import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { denunciasApi } from '@/lib/api/denuncias';
import { Spinner, Card, Badge, Button, Avatar } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import type { DenunciaComDetalhes, DenunciaAccao } from '@pdc/shared';

export function DenunciaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [accao, setAccao] = useState<DenunciaAccao>('remover_conteudo');
  const [nota, setNota] = useState('');

  const { data: denuncia, isLoading } = useQuery<DenunciaComDetalhes | undefined>({
    queryKey: ['denuncias', id],
    queryFn: () => denunciasApi.getById(id ?? '').then(res => res.data),
    enabled: !!id,
  });

  const resolveMutation = useMutation({
    mutationFn: () => denunciasApi.resolver(id ?? '', { 
      estado: 'resolvida',
      accaoTomada: accao, 
      notasModerador: nota 
    }),
    onSuccess: () => {
      toast({ title: 'Denúncia resolvida', description: 'A ação foi aplicada com sucesso.' });
      void queryClient.invalidateQueries({ queryKey: ['denuncias'] });
      navigate('/app/moderacao/denuncias');
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível resolver a denúncia.' });
    }
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!denuncia) return <p className="py-12 text-center text-ink-secondary">Denúncia não encontrada.</p>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-ink-primary">Detalhes da Denúncia</h1>
        <Badge variant={denuncia.estado === 'pendente' ? 'warning' : denuncia.estado === 'resolvida' ? 'success' : 'info'}>
          {denuncia.estado.replace('_', ' ')}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 p-6 space-y-4">
          <h2 className="font-semibold text-lg text-ink-primary">Conteúdo Reportado</h2>
          <div className="p-4 bg-canvas border border-ink-tertiary/10 rounded-lg space-y-2">
            <p className="text-sm text-ink-secondary">Tipo: <span className="text-ink-primary font-medium">{denuncia.conteudoTipo}</span></p>
            <p className="text-sm text-ink-secondary">ID do Recurso: <span className="text-ink-primary font-mono text-xs">{denuncia.conteudoId}</span></p>
            <div className="pt-2 border-t border-ink-tertiary/10 mt-2">
              <p className="text-sm font-medium text-ink-primary mb-1">Motivo/Descrição:</p>
              <p className="text-ink-primary whitespace-pre-wrap text-sm">{denuncia.motivo}</p>
            </div>
          </div>
          <p className="text-xs text-ink-secondary">Reportado em: {new Date(denuncia.criadaEm).toLocaleString()}</p>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-lg text-ink-primary">Denunciante</h2>
          {denuncia.denunciante ? (
            <div className="flex items-center gap-3">
              <Avatar 
                fallback={denuncia.denunciante.nome.substring(0, 2).toUpperCase()} 
                {...(denuncia.denunciante.avatarUrl ? { src: denuncia.denunciante.avatarUrl } : {})} 
                size="md" 
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-primary truncate">{denuncia.denunciante.nome}</p>
                <p className="text-xs text-ink-secondary truncate">{denuncia.denunciante.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-secondary">ID: {denuncia.denuncianteId}</p>
          )}
        </Card>
      </div>

      {denuncia.estado !== 'resolvida' && (
        <Card className="p-6">
          <h2 className="font-semibold text-lg text-ink-primary mb-4">Resolver Denúncia</h2>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-ink-secondary">Ação a tomar</label>
              <select
                value={accao}
                onChange={(e) => { setAccao(e.target.value as DenunciaAccao); }}
                className="w-full max-w-xs rounded-md border border-ink-tertiary/10 bg-canvas px-3 py-2 text-sm text-ink-primary focus-outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="remover_conteudo">Remover conteúdo</option>
                <option value="advertir">Avisar utilizador</option>
                <option value="ignorar">Ignorar denúncia</option>
                <option value="banir_utilizador">Banir Utilizador</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-ink-secondary">Nota de resolução</label>
              <textarea
                value={nota}
                onChange={(e) => { setNota(e.target.value); }}
                className="w-full rounded-md border border-ink-tertiary/10 bg-canvas px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent min-h-[100px]"
                placeholder="Descreva o motivo desta decisão…"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button 
                variant="primary"
                isLoading={resolveMutation.isPending} 
                onClick={() => { resolveMutation.mutate(); }}
                disabled={!nota.trim()}
              >
                Concluir Resolução
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
