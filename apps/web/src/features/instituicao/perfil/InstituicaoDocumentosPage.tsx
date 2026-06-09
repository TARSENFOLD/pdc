import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { instituicoesApi, type InstituicaoEditor } from '@/lib/api/instituicoes';
import { toast } from '@/hooks/useToast';

export function InstituicaoDocumentosPage() {
  const { instituicao } = useOutletContext<{ instituicao: InstituicaoEditor }>();
  const queryClient = useQueryClient();
  const submit = useMutation({
    mutationFn: instituicoesApi.submeter,
    onSuccess: data => {
      queryClient.setQueryData(['instituicao', 'me'], data);
      toast({ title: 'Instituição submetida para verificação' });
    },
  });
  async function upload(file: File) {
    try {
      const data = await instituicoesApi.addDocumento(file, 'outro');
      queryClient.setQueryData(['instituicao', 'me'], data);
      toast({ title: 'Documento privado carregado' });
    } catch {
      toast({ title: 'Erro ao carregar documento', variant: 'error' });
    }
  }
  return (
    <Card className="space-y-5 p-6">
      <div>
        <h2 className="text-xl font-bold">Documentos e verificação</h2>
        <p className="mt-1 text-sm text-ink-secondary">Os documentos e o NIF nunca aparecem no perfil público.</p>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-[var(--card-border)] px-4 text-sm font-semibold">
        Carregar documento
        <input className="hidden" type="file" accept=".pdf,image/*" onChange={event => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }} />
      </label>
      <ul className="space-y-2 text-sm">
        {(instituicao.documentos ?? []).map((doc, index) => (
          <li key={`${doc.nome}-${doc.tipo}-${String(index)}`} className="rounded-lg bg-recessed p-3">
            {doc.nome} · {doc.estadoAnalise}
          </li>
        ))}
      </ul>
      <Button disabled={submit.isPending || instituicao.estado === 'pending_review'} onClick={() => { submit.mutate(); }}>
        {submit.isPending ? 'A submeter...' : 'Submeter para verificação'}
      </Button>
    </Card>
  );
}
