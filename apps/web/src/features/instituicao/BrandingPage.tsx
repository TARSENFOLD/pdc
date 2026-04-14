import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UpdatePerfilPayloadSchema, type UpdatePerfilPayload } from '@pdc/shared';
import { perfisApi } from '@/lib/api/perfis';
import { mediaApi } from '@/lib/api/media';
import { Card, Button, Input, Spinner, Avatar } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { useState } from 'react';

export function BrandingPage() {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  
  const { data: user, isLoading } = useQuery({
    queryKey: ['perfis', 'me'],
    queryFn: () => perfisApi.getMe(),
  });

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(UpdatePerfilPayloadSchema),
    values: {
      nome: user?.nome ?? '',
      bio: user?.bio ?? '',
      telefone: user?.telefone ?? '',
      website: user?.website ?? '',
    }
  });

  const avatarUrl = user?.avatarUrl;
const mutation = useMutation({
  mutationFn: (data: UpdatePerfilPayload) => perfisApi.update(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['perfis', 'me'] });
    toast({ title: 'Perfil atualizado com sucesso!' });
  },
  onError: (err: unknown) => {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    toast({ title: 'Erro ao atualizar perfil', description: msg, variant: 'error' });
  }
});

const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    setIsUploading(true);
    const result = await mediaApi.upload(file);
    await perfisApi.update({ avatarUrl: result.url });
    queryClient.invalidateQueries({ queryKey: ['perfis', 'me'] });
    toast({ title: 'Logotipo atualizado!' });
  } catch (err) {
    toast({ title: 'Erro ao fazer upload', variant: 'error' });
  } finally {
    setIsUploading(false);
  }
};

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Branding e Identidade</h1>

      <Card className="p-6">
        <div className="flex flex-col items-center gap-4 mb-8">
          <Avatar src={avatarUrl as string} fallback={user?.nome?.[0] ?? 'I'} size="lg" className="h-24 w-24" />
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" asChild>
              <label className="cursor-pointer">
                {isUploading ? 'A carregar...' : 'Alterar Logotipo'}
                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={isUploading} />
              </label>
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit((data: UpdatePerfilPayload) => { mutation.mutate(data); })} className="space-y-4">
          <Input 
            label="Nome da Instituição" 
            {...register('nome')}
            error={errors.nome?.message || ''}
          />
          
          <div className="space-y-1">
            <label className="text-sm font-medium">Descrição Pública</label>
            <textarea 
              className="flex min-h-[120px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Conte aos alunos sobre a vossa missão..."
              {...register('bio')}
            />
            {errors.bio && <p className="text-xs text-error">{errors.bio.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Website" 
              placeholder="https://..."
              {...register('website')}
              error={errors.website?.message || ''}
            />
            <Input 
              label="Telefone de Contacto" 
              {...register('telefone')}
              error={errors.telefone?.message || ''}
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" isLoading={mutation.isPending}>
              Guardar Alterações
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
