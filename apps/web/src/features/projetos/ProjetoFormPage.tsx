import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projetosApi } from '@/lib/api/projetos';
import { mediaApi } from '@/lib/api/media';
import { Spinner, Button, Input } from '@/components/ui';

export function ProjetoFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: projeto, isLoading } = useQuery({
    queryKey: ['projetos', id ?? ''],
    queryFn: () => projetosApi.getById(id ?? ''),
    enabled: isEdit,
  });

  useEffect(() => {
    if (projeto) {
      setTitulo(projeto.titulo);
      setDescricao(projeto.descricao);
      setRepoUrl(projeto.repoUrl ?? '');
      setDemoUrl(projeto.demoUrl ?? '');
      setTagsInput(projeto.tags?.join(', ') ?? '');
      setImagemUrl(projeto.imagemUrl ?? '');
    }
  }, [projeto]);

  const mutation = useMutation({
    mutationFn: () => {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const payload = {
        titulo,
        descricao,
        ...(repoUrl ? { repoUrl } : {}),
        ...(demoUrl ? { demoUrl } : {}),
        ...(imagemUrl ? { imagemUrl } : {}),
        ...(tags.length > 0 ? { tags } : {}),
      };
      return isEdit
        ? projetosApi.update(id, payload)
        : projetosApi.create(payload as Parameters<typeof projetosApi.create>[0]);
    },
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: ['projetos'] });
      navigate(`/projetos/${saved.id}`);
    },
  });

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await mediaApi.upload(file);
      setImagemUrl(result.publicUrl);
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  if (isEdit && isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold text-text-primary">
        {isEdit ? 'Editar Projeto' : 'Novo Projeto'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Título *</label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} required minLength={3} maxLength={120} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Descrição *</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
            minLength={10}
            maxLength={2000}
            rows={4}
            className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Tags (separadas por vírgula)</label>
          <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="ex: react, typescript, api" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Repositório</label>
          <Input type="url" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/…" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Demo</label>
          <Input type="url" value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} placeholder="https://…" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Imagem de capa</label>
          {imagemUrl && (
            <img src={imagemUrl} alt="capa" className="mb-2 h-32 w-full rounded-md object-cover" />
          )}
          <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm text-text-secondary" disabled={uploading} />
          {uploading && <p className="mt-1 text-xs text-text-muted">A carregar…</p>}
        </div>

        {mutation.isError && (
          <p className="text-sm text-error">Erro ao guardar o projeto. Tenta novamente.</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEdit ? 'Guardar alterações' : 'Criar Projeto'}
          </Button>
        </div>
      </form>
    </div>
  );
}
