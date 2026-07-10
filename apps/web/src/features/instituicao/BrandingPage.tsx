import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IdentidadeInstituicaoSchema, type IdentidadeInstituicao } from '@pdc/shared';
import { instituicoesApi } from '@/lib/api/instituicoes';
import { mediaApi } from '@/lib/api/media';
import { Card, Button, Input, Spinner, Avatar } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function BrandingPage() {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  
  const { data: instituicao, isLoading } = useQuery({
    queryKey: ['instituicoes', 'me'],
    queryFn: () => instituicoesApi.getMe(),
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<IdentidadeInstituicao>({
    resolver: zodResolver(IdentidadeInstituicaoSchema),
    defaultValues: {
      nome: '',
      nomeLegal: '',
      sigla: '',
      tipo: 'outro',
      natureza: 'outra',
      nif: '',
      descricao: '',
      anoFundacao: undefined,
    },
  });

  useEffect(() => {
    if (!instituicao) return;
    reset({
      nome: instituicao.identidade.nome ?? '',
      nomeLegal: instituicao.identidade.nomeLegal ?? instituicao.identidade.nome ?? '',
      sigla: instituicao.identidade.sigla ?? '',
      tipo: instituicao.identidade.tipo ?? 'outro',
      natureza: instituicao.identidade.natureza ?? 'outra',
      nif: instituicao.identidade.nif ?? '',
      descricao: instituicao.identidade.descricao ?? '',
      anoFundacao: instituicao.identidade.anoFundacao,
    }, { keepDirtyValues: true });
  }, [instituicao, reset]);

  const logoUrl = instituicao?.multimedia?.logoUrl;
const mutation = useMutation({
  mutationFn: (data: IdentidadeInstituicao) => instituicoesApi.save('identidade', data),
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: ['instituicoes', 'me'] });
    toast({ title: 'Identidade institucional atualizada com sucesso!' });
  },
  onError: (err: unknown) => {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    toast({ title: 'Erro ao atualizar instituição', description: msg, variant: 'error' });
  }
});

const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const upload = async () => {
    try {
      setIsUploading(true);
      const result = await mediaApi.upload(file, 'generic');
      const latest = await queryClient.fetchQuery({
        queryKey: ['instituicoes', 'me'],
        queryFn: () => instituicoesApi.getMe(),
        staleTime: 0,
      });
      await instituicoesApi.save('multimedia', {
        logoUrl: result.url,
        capaUrl: latest.multimedia?.capaUrl,
        galeriaUrls: latest.multimedia?.galeriaUrls ?? [],
        videoUrl: latest.multimedia?.videoUrl,
        redesSociais: latest.multimedia?.redesSociais ?? {},
      });
      void queryClient.invalidateQueries({ queryKey: ['instituicoes', 'me'] });
      toast({ title: 'Logotipo atualizado!' });
    } catch {
      toast({ title: 'Erro ao fazer upload', variant: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  void upload();
};

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Branding e Identidade</h1>

      <Card className="p-6">
        <div className="flex flex-col items-center gap-4 mb-8">
          <Avatar src={logoUrl || undefined} fallback={instituicao?.identidade.nome[0] ?? 'I'} size="lg" className="h-24 w-24" />
          <div className="flex items-center gap-2">
            <label
              aria-disabled={isUploading}
              className={cn(
                'inline-flex h-11 min-w-[44px] items-center justify-center rounded-md border border-ink-tertiary/10 bg-recessed px-4 text-xs font-semibold text-ink-primary transition-all hover:bg-canvas/50',
                isUploading ? 'cursor-not-allowed opacity-50 pointer-events-none' : 'cursor-pointer'
              )}
            >
              {isUploading ? 'A carregar...' : 'Alterar Logotipo'}
              <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={isUploading} />
            </label>
          </div>
        </div>

        <form onSubmit={(e) => { void handleSubmit((data: IdentidadeInstituicao) => { mutation.mutate(data); })(e); }} className="space-y-4">
          <Input 
            label="Nome da Instituição" 
            {...register('nome')}
            error={errors.nome?.message || ''}
          />

          <Input
            label="Nome Legal"
            {...register('nomeLegal')}
            error={errors.nomeLegal?.message || ''}
          />
          
          <div className="space-y-1">
            <label className="text-sm font-medium">Descrição Pública</label>
            <textarea 
              className="flex min-h-[120px] w-full rounded-md border border-ink-tertiary/10 bg-canvas px-3 py-2 text-sm text-ink-primary ring-offset-background placeholder:text-ink-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Conte aos estudantes sobre a vossa missão..."
              {...register('descricao')}
            />
            {errors.descricao && <p className="text-xs text-error">{errors.descricao.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Sigla"
              {...register('sigla')}
              error={errors.sigla?.message || ''}
            />
            <Input 
              label="NIF"
              {...register('nif')}
              error={errors.nif?.message || ''}
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'A guardar...' : 'Guardar Alterações'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
