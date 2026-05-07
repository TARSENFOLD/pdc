import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, Plus, X, LinkIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Card, Input, Badge, Spinner } from '@/components/ui';
import { EcosystemImpactPanel } from '@/components/ecosystem/EcosystemImpactPanel';
import { useMutation } from '@tanstack/react-query';
import { conquistasApi } from '@/lib/api/conquistas';
import { toast } from '@/hooks/useToast';
import { CriarConquistaManualPayloadSchema, type CriarConquistaManualPayload } from '@pdc/shared';

const CATEGORIAS = [
  'Certificação Externa',
  'Participação em Evento',
  'Publicação',
  'Voluntariado',
  'Projecto Pessoal',
  'Outro',
];

export default function ConquistaManualComposer(): React.ReactElement {
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [mediaInput, setMediaInput] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && tags.length < 10 && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const addMediaUrl = () => {
    const url = mediaInput.trim();
    try {
      new URL(url);
      if (mediaUrls.length < 5 && !mediaUrls.includes(url)) {
        setMediaUrls([...mediaUrls, url]);
        setMediaInput('');
      }
    } catch {
      toast({ title: 'URL inválido', description: 'Introduz um URL completo (ex: https://...)', variant: 'error' });
    }
  };

  const removeMediaUrl = (url: string) => {
    setMediaUrls(mediaUrls.filter((u) => u !== url));
  };

  const mutation = useMutation({
    mutationFn: (payload: CriarConquistaManualPayload) =>
      conquistasApi.createManual(payload),
    onSuccess: (res) => {
      toast({ title: 'Conquista submetida!', description: 'A tua conquista será validada pelo ecossistema.', variant: 'success' });
      if (res.eventId) {
        setLastEventId(res.eventId);
      } else {
        navigate('/app/conquistas');
      }
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao submeter',
        description: error instanceof Error ? error.message : 'Não foi possível registar a conquista. Tenta novamente.',
        variant: 'error',
      });
    },
  });

  const isValid = titulo.length >= 3 && descricao.length >= 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const parsed = CriarConquistaManualPayloadSchema.safeParse({
      titulo,
      descricao,
      categoria: categoria.trim() || undefined,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      tags: tags.length > 0 ? tags : undefined,
    });

    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Conquista inválida.');
      return;
    }

    setValidationError(null);
    mutation.mutate(parsed.data);
  };

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-8 pb-20 animate-in fade-in duration-700">
        <div className="flex items-center gap-4">
          <Link to="/app/conquistas">
            <Button variant="ghost" size="sm" className="rounded-xl">
              <ArrowLeft size={16} className="mr-2" /> Voltar
            </Button>
          </Link>
          <div>
            <Badge variant="info" className="bg-accent/10 text-accent border-accent/20 px-2 py-0.5 uppercase tracking-widest text-[8px] font-black mb-1">
              Merit Registry
            </Badge>
            <h1 className="text-2xl font-black tracking-tight font-display">
              Registar Conquista Manual
            </h1>
          </div>
        </div>

        <p className="text-ink-secondary text-sm leading-relaxed">
          Submete realizações fora do ecossistema digital para enriquecer o teu portfólio de mérito.
          Conquistas de autores com mais de 7 dias na plataforma são auto-aprovadas.
        </p>

        <Card className="p-8 border-white/5 bg-elevated/50">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-ink-tertiary">
              Título da Conquista *
            </label>
            <Input
              value={titulo}
              onChange={(e) => { setTitulo(e.target.value); }}
              placeholder="Ex: Certificação AWS Cloud Practitioner"
              maxLength={120}
            />
            <p className="text-[10px] text-ink-tertiary">{titulo.length}/120 caracteres (mín. 3)</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-ink-tertiary">
              Descrição *
            </label>
            <textarea
              value={descricao}
              onChange={(e) => { setDescricao(e.target.value); }}
              placeholder="Descreve a conquista, o contexto, e o que aprendeste..."
              maxLength={2000}
              rows={5}
              className="w-full rounded-2xl border border-white/10 bg-recessed/50 px-4 py-3 text-sm text-ink-primary placeholder:text-ink-tertiary/50 focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all resize-none"
            />
            <p className="text-[10px] text-ink-tertiary">{descricao.length}/2000 caracteres (mín. 10)</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-ink-tertiary">
              Categoria
            </label>
            <select
              value={categoria}
              onChange={(e) => { setCategoria(e.target.value); }}
              className="w-full rounded-2xl border border-white/10 bg-recessed/50 px-4 py-3 text-sm text-ink-primary focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all"
            >
              <option value="">Selecionar categoria...</option>
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-ink-tertiary">
              <LinkIcon size={10} className="inline mr-1" /> Evidências / URLs (até 5)
            </label>
            <div className="flex gap-2">
              <Input
                value={mediaInput}
                onChange={(e) => { setMediaInput(e.target.value); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMediaUrl(); } }}
                placeholder="https://exemplo.com/certificado.pdf"
                className="flex-1"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addMediaUrl} className="rounded-xl">
                <Plus size={14} />
              </Button>
            </div>
            {mediaUrls.length > 0 && (
              <div className="space-y-1 mt-2">
                {mediaUrls.map((url) => (
                  <div key={url} className="flex items-center gap-2 bg-recessed/50 rounded-xl px-3 py-1.5 text-xs">
                    <LinkIcon size={10} className="text-accent shrink-0" />
                    <span className="truncate text-ink-secondary flex-1">{url}</span>
                    <button type="button" onClick={() => { removeMediaUrl(url); }} className="text-ink-tertiary hover:text-error transition-colors shrink-0">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-ink-tertiary">
              Tags (até 10)
            </label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => { setTagInput(e.target.value); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Adicionar tag..."
                className="flex-1"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addTag} className="rounded-xl">
                <Plus size={14} />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} className="bg-accent/10 text-accent border-accent/20 flex items-center gap-1 px-2 py-1">
                    {tag}
                    <button type="button" onClick={() => { removeTag(tag); }} className="hover:text-error transition-colors">
                      <X size={10} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] text-ink-tertiary flex items-center gap-2">
                <Trophy size={14} className="text-accent" />
                Validada pelo motor de mérito G15
              </p>
              {validationError && <p className="text-[10px] text-error">{validationError}</p>}
            </div>
            <Button
              type="submit"
              disabled={!isValid || mutation.isPending}
              className="h-12 px-8 rounded-2xl bg-accent text-white font-bold hover:bg-accent/90 transition-all disabled:opacity-50"
            >
              {mutation.isPending ? <Spinner size="sm" /> : 'Submeter Conquista'}
            </Button>
          </div>
        </form>
        </Card>
      </div>
      <AnimatePresence>
        {lastEventId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-canvas/95 p-6 backdrop-blur-md"
          >
            <div className="w-full max-w-xl">
              <EcosystemImpactPanel
                eventId={lastEventId}
                variant="full"
                onComplete={() => { navigate('/app/conquistas'); }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
