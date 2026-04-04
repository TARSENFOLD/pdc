import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { denunciasApi } from '@/lib/api/denuncias';
import { Spinner, Card, Badge, Button, Avatar } from '@/components/ui';
import { useToast } from '@/hooks/useToast';

export function DenunciaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [accao, setAccao] = useState<'remover' | 'avisar' | 'ignorar'>('remover');
  const [nota, setNota] = useState('');

  const { data: denuncia, isLoading } = useQuery({
    queryKey: ['denuncias', id],
    queryFn: () => denunciasApi.getById(id!).then(res => res.data),
    enabled: !!id,
  });

  const resolveMutation = useMutation({
    mutationFn: () => denunciasApi.resolver(id!, { accao, nota }),
    onSuccess: () => {
      toast.show({ title: 'Denúncia resolvida', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['denuncias'] });
      navigate('/app/moderacao/denuncias');
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!denuncia) return <p className="py-12 text-center text-text-muted">Denúncia não encontrada.</p>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-text-primary">Detalhes da Denúncia</h1>
        <Badge variant={denuncia.estado === 'pendente' ? 'warning' : 'success'}>
          {denuncia.estado}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 p-6 space-y-4">
          <h2 className="font-semibold text-lg text-text-primary">Conteúdo Reportado</h2>
          <div className="p-4 bg-background border border-border rounded-lg">
            <p className="text-sm text-text-muted mb-1">Tipo: <span className="text-text-primary font-medium">{denuncia.conteudoTipo}</span></p>
            <p className="text-sm text-text-muted mb-4">ID: <span className="text-text-primary font-mono">{denuncia.conteudoId}</span></p>
            <p className="text-text-primary whitespace-pre-wrap">{denuncia.motivo}</p>
          </div>
          <p className="text-xs text-text-muted">Reportado em: {new Date(denuncia.criadaEm).toLocaleString()}</p>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-lg text-text-primary">Denunciante</h2>
          {denuncia.denunciante && (
            <div className="flex items-center gap-3">
              <Avatar name={denuncia.denunciante.nome} src={denuncia.denunciante.avatarUrl} />
              <div>
                <p className="text-sm font-medium text-text-primary">{denuncia.denunciante.nome}</p>
                <p className="text-xs text-text-muted">{denuncia.denunciante.email}</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {denuncia.estado !== 'resolvida' && (
        <Card className="p-6">
          <h2 className="font-semibold text-lg text-text-primary mb-4">Resolver Denúncia</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary">Ação</label>
              <select
                value={accao}
                onChange={(e) => setAccao(e.target.value as any)}
                className="mt-1 w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber"
              >
                <option value="remover">Remover conteúdo</option>
                <option value="avisar">Avisar utilizador</option>
                <option value="ignorar">Ignorar denúncia</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary">Nota de resolução</label>
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber min-h-[100px]"
                placeholder="Explique a decisão…"
              />
            </div>
            <div className="flex justify-end">
              <Button 
                isLoading={resolveMutation.isPending} 
                onClick={() => resolveMutation.mutate()}
                className="bg-amber text-background"
              >
                Concluir resolução
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
