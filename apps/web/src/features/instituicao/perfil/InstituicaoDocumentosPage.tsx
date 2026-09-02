import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { useState } from 'react';
import { Button, Card } from '@/components/ui';
import {
  institutionKeys,
  instituicoesApi,
  type InstituicaoEditor,
} from '@/lib/api/instituicoes';
import { toast } from '@/hooks/useToast';

const DOCUMENTO_TIPOS = [
  { value: 'nif', label: 'NIF' },
  { value: 'alvara', label: 'Alvará' },
  { value: 'estatuto', label: 'Estatuto' },
  { value: 'acreditacao', label: 'Acreditação' },
  { value: 'representacao', label: 'Representação legal' },
  { value: 'outro', label: 'Outro' },
] as const;

type DocumentoTipo = typeof DOCUMENTO_TIPOS[number]['value'];

function isDocumentoTipo(value: string): value is DocumentoTipo {
  return DOCUMENTO_TIPOS.some((tipo) => tipo.value === value);
}

export function InstituicaoDocumentosPage() {
  const { instituicao } = useOutletContext<{ instituicao: InstituicaoEditor }>();
  const queryClient = useQueryClient();
  const [tipoDocumento, setTipoDocumento] = useState<DocumentoTipo>('nif');
  const submit = useMutation({
    mutationFn: instituicoesApi.submeter,
    onSuccess: data => {
      queryClient.setQueryData(institutionKeys.me(), data);
      toast({ title: 'Instituição submetida para verificação' });
    },
  });
  async function upload(file: File) {
    try {
      const data = await instituicoesApi.addDocumento(file, tipoDocumento);
      queryClient.setQueryData(institutionKeys.me(), data);
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
      <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
        <label className="space-y-1">
          <span className="text-sm font-medium">Tipo de documento</span>
          <select
            value={tipoDocumento}
            onChange={(event) => {
              if (isDocumentoTipo(event.target.value)) setTipoDocumento(event.target.value);
            }}
            className="h-11 w-full rounded-lg border border-[var(--card-border)] bg-canvas px-3 text-sm"
          >
            {DOCUMENTO_TIPOS.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-[var(--card-border)] px-4 text-sm font-semibold">
          Carregar documento
          <input className="hidden" type="file" accept=".pdf,image/*" onChange={event => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }} />
        </label>
      </div>
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
