import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { perfisApi } from '@/lib/api/perfis';
import { mediaApi } from '@/lib/api/media';
import { Button, Spinner, Input } from '@/components/ui';
import { DenunciarButton } from '@/components/ui/DenunciarButton';
import { useTelemetry } from '@/hooks/useTelemetry';
import type { UpdatePerfilPayload } from '@pdc/shared';

interface FormState {
  nome: string;
  bio: string;
  telefone: string;
  linkedinUrl: string;
  githubUrl: string;
  website: string;
}

const EMPTY_FORM: FormState = {
  nome: '',
  bio: '',
  telefone: '',
  linkedinUrl: '',
  githubUrl: '',
  website: '',
};

export function PerfilPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);
  const { track } = useTelemetry();

  const [form, setForm] = useState(EMPTY_FORM);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['perfis', 'me'],
    queryFn: () => perfisApi.getMe(),
  });

  useEffect(() => {
    if (perfil && !initialized.current) {
      initialized.current = true;
      track('page.viewed', { page: 'perfil', userId: perfil.id });
      setForm({
        nome: perfil.nome,
        bio: perfil.bio ?? '',
        telefone: perfil.telefone ?? '',
        linkedinUrl: perfil.socialLinks?.find(l => l.platform === 'linkedin')?.url ?? '',
        githubUrl: perfil.socialLinks?.find(l => l.platform === 'github')?.url ?? '',
        website: perfil.website ?? '',
      });
    }
  }, [perfil]);

  const avatarMutation = useMutation({
    mutationFn: (file: File) => mediaApi.upload(file),
    onSuccess: (result) => {
      setAvatarPreview(result.url);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePerfilPayload) => perfisApi.update(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['perfis', 'me'] });
      track('page.viewed', { page: 'perfil', action: 'updated' });
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); }, 3000);
    },
  });

  function handleField(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: UpdatePerfilPayload = {
      bio: form.bio,
      telefone: form.telefone || undefined,
      website: form.website || undefined,
      socialLinks: [
        ...(form.linkedinUrl ? [{ platform: 'linkedin', url: form.linkedinUrl }] : []),
        ...(form.githubUrl ? [{ platform: 'github', url: form.githubUrl }] : []),
      ],
    };
    if (form.nome.length >= 2) payload.nome = form.nome;
    updateMutation.mutate(payload);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const currentAvatar = avatarPreview ?? perfil?.avatarUrl;

  return (
    <div className="max-w-lg">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">O meu Perfil</h1>
        {perfil?.id && <DenunciarButton conteudoId={perfil.id} conteudoTipo="utilizador" />}
      </div>

      {/* Avatar */}
      <div className="mb-8 flex items-center gap-5">
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-surface-raised text-2xl font-bold text-text-primary overflow-hidden">
          {currentAvatar ? (
            <img src={currentAvatar} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            (perfil?.nome[0] ?? '?').toUpperCase()
          )}
        </div>
        <div>
          <Button
            size="sm"
            variant="secondary"
            isLoading={avatarMutation.isPending}
            onClick={() => fileRef.current?.click()}
          >
            Alterar avatar
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) avatarMutation.mutate(file);
            }}
          />
          {avatarMutation.isError && (
            <p className="mt-1 text-xs text-error">Erro ao carregar imagem.</p>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input id="nome" label="Nome" value={form.nome} onChange={handleField('nome')} />

        <div className="w-full space-y-1.5">
          <label htmlFor="bio" className="text-sm font-medium text-text-secondary">Bio</label>
          <textarea
            id="bio"
            rows={3}
            maxLength={500}
            value={form.bio}
            onChange={handleField('bio')}
            className="flex w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber resize-none"
          />
          <p className="text-right text-xs text-text-muted">{form.bio.length}/500</p>
        </div>

        <Input id="telefone" label="Telefone" value={form.telefone} onChange={handleField('telefone')} />
        <Input id="linkedinUrl" label="LinkedIn" type="url" value={form.linkedinUrl} onChange={handleField('linkedinUrl')} />
        <Input id="githubUrl" label="GitHub" type="url" value={form.githubUrl} onChange={handleField('githubUrl')} />
        <Input id="websiteUrl" label="Website" type="url" value={form.website} onChange={handleField('website')} />

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" isLoading={updateMutation.isPending}>
            Guardar alterações
          </Button>
          {saveSuccess && <span className="text-sm text-success">Perfil actualizado ✓</span>}
          {updateMutation.isError && <span className="text-sm text-error">Erro ao guardar.</span>}
        </div>
      </form>
    </div>
  );
}
