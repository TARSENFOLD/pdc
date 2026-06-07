import { useEffect, useState } from 'react';
import { useFieldArray, type Control, type UseFormRegister, type UseFormSetValue, type UseFormWatch } from 'react-hook-form';
import { ArrowLeft, ChevronDown, ChevronUp, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import type { CriarExperienciaPayload, ExperienciaItem, ExperienciaSecao } from '@pdc/shared';
import { Button, Input, Select } from '@/components/ui';
import { BuilderUploadZone } from '@/components/builders';
import { newExperienceItem, newExperienceSection } from './experience-section-factory';

const SECTION_TYPES: Array<{ value: ExperienciaSecao['tipo']; label: string }> = [
  { value: 'boas_vindas', label: 'Boas-vindas' },
  { value: 'ano_fase', label: 'Ano ou fase' },
  { value: 'depoimentos', label: 'Depoimentos' },
  { value: 'realidade', label: 'Realidade da área' },
  { value: 'infraestrutura', label: 'Infraestrutura' },
  { value: 'curriculo', label: 'Currículo ou timeline' },
  { value: 'carreira', label: 'Carreira' },
  { value: 'materiais', label: 'Materiais de apoio' },
  { value: 'faq', label: 'Perguntas frequentes' },
  { value: 'proximos_passos', label: 'Próximos passos' },
  { value: 'personalizado', label: 'Módulo personalizado' },
];

const ITEM_TYPES: Array<{ value: ExperienciaItem['tipo']; label: string }> = [
  { value: 'texto', label: 'Texto' },
  { value: 'video', label: 'Vídeo' },
  { value: 'imagem', label: 'Imagem' },
  { value: 'galeria', label: 'Galeria' },
  { value: 'pdf', label: 'PDF' },
  { value: 'link', label: 'Link externo' },
  { value: 'audio', label: 'Áudio' },
  { value: 'depoimento', label: 'Depoimento' },
  { value: 'faq', label: 'Pergunta e resposta' },
  { value: 'cta', label: 'Chamada para ação' },
  { value: 'estatistica', label: 'Estatística' },
];

interface Props {
  control: Control<CriarExperienciaPayload>;
  register: UseFormRegister<CriarExperienciaPayload>;
  watch: UseFormWatch<CriarExperienciaPayload>;
  setValue: UseFormSetValue<CriarExperienciaPayload>;
  onEditingChange?: (editing: boolean) => void;
}

function sectionPath(index: number): `secoes.${number}` {
  return `secoes.${String(index)}` as `secoes.${number}`;
}

function itemPath(sectionIndex: number, itemIndex: number): `secoes.${number}.itens.${number}` {
  return `secoes.${String(sectionIndex)}.itens.${String(itemIndex)}` as `secoes.${number}.itens.${number}`;
}

function MediaPreview({ item, url, onRemove }: { item: ExperienciaItem; url: string; onRemove: () => void }) {
  return (
    <div className="overflow-hidden border border-border bg-recessed">
      {item.tipo === 'video' ? (
        <video src={url} controls className="aspect-video w-full bg-black object-contain" />
      ) : item.tipo === 'audio' ? (
        <div className="flex min-h-32 items-center justify-center p-5"><audio src={url} controls className="w-full" /></div>
      ) : item.tipo === 'imagem' || item.tipo === 'galeria' ? (
        <img src={url} alt={item.titulo} className="aspect-video w-full object-cover" />
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center">
          <FileText size={32} className="text-accent" />
          <a href={url} target="_blank" rel="noreferrer" className="max-w-full truncate text-sm font-semibold text-accent underline">Abrir ficheiro carregado</a>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
        <span className="min-w-0 truncate text-xs text-ink-tertiary">{url}</span>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>Remover</Button>
      </div>
    </div>
  );
}

export function ExperienceSectionsBuilder({ control, register, watch, setValue, onEditingChange }: Props) {
  const sections = useFieldArray({ control, name: 'secoes', keyName: 'fieldKey' });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [newType, setNewType] = useState<ExperienciaSecao['tipo']>('personalizado');

  useEffect(() => {
    if (activeIndex !== null && activeIndex >= sections.fields.length) setActiveIndex(null);
  }, [activeIndex, sections.fields.length]);

  useEffect(() => {
    onEditingChange?.(activeIndex !== null);
    return () => { onEditingChange?.(false); };
  }, [activeIndex, onEditingChange]);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.fields.length) return;
    sections.swap(index, target);
    if (activeIndex === index) setActiveIndex(target);
    setValue('secoes', watch('secoes').map((section, ordem) => ({ ...section, ordem })), { shouldDirty: true });
  };

  if (sections.fields.length === 0) {
    return (
      <div className="border border-dashed border-border p-10 text-center">
        <p className="text-sm text-ink-secondary">Ainda não existem módulos.</p>
        <Button type="button" className="mt-4" onClick={() => { sections.append(newExperienceSection('boas_vindas', 0, 'Boas-vindas')); }}>Criar primeiro módulo</Button>
      </div>
    );
  }

  if (activeIndex === null) {
    return (
      <div className="space-y-8">
        <div className="grid gap-3">
          {sections.fields.map((section, index) => {
            const sectionData = watch(sectionPath(index));
            return (
              <article key={section.fieldKey} className="grid gap-5 border-b border-border py-6 first:pt-0 md:grid-cols-[48px_minmax(0,1fr)_auto] md:items-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-sm text-ink-secondary">
                  {String(index + 1)}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-accent">
                    {SECTION_TYPES.find((option) => option.value === sectionData.tipo)?.label}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-ink-primary">{sectionData.titulo}</h3>
                  <p className="mt-1 text-sm text-ink-secondary">
                    {String(sectionData.itens.length)} {sectionData.itens.length === 1 ? 'conteúdo' : 'conteúdos'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setActiveIndex(index); }}>
                    <Pencil size={14} /> Editar
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { move(index, -1); }} aria-label="Mover módulo para cima"><ChevronUp size={16} /></Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { move(index, 1); }} aria-label="Mover módulo para baixo"><ChevronDown size={16} /></Button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="grid gap-3 border-t border-border pt-7 sm:grid-cols-[minmax(0,280px)_auto] sm:items-end">
          <Select label="Tipo do novo módulo" value={newType} onChange={(event) => { setNewType(event.target.value as ExperienciaSecao['tipo']); }}>
            {SECTION_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Button
            type="button"
            className="sm:w-fit"
            onClick={() => {
              const label = SECTION_TYPES.find((option) => option.value === newType)?.label ?? 'Novo módulo';
              sections.append(newExperienceSection(newType, sections.fields.length, label));
              setActiveIndex(sections.fields.length);
            }}
          >
            <Plus size={16} /> Adicionar módulo
          </Button>
        </div>
      </div>
    );
  }

  const currentSectionPath = sectionPath(activeIndex);
  const items = watch(`${currentSectionPath}.itens`);

  return (
    <div className="mx-auto max-w-3xl">
      <button type="button" onClick={() => { setActiveIndex(null); }} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-ink-secondary hover:text-ink-primary">
        <ArrowLeft size={16} /> Voltar aos módulos
      </button>
      <main className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="text-xs font-bold uppercase text-accent">Módulo {String(activeIndex + 1)}</p>
            <h3 className="mt-1 text-xl font-bold text-ink-primary">{watch(`${currentSectionPath}.titulo`)}</h3>
          </div>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => { move(activeIndex, -1); }} aria-label="Mover para cima"><ChevronUp size={16} /></Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { move(activeIndex, 1); }} aria-label="Mover para baixo"><ChevronDown size={16} /></Button>
            <Button type="button" variant="ghost" size="sm" className="text-accent-danger" onClick={() => { sections.remove(activeIndex); }} aria-label="Remover módulo"><Trash2 size={16} /></Button>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-[200px_1fr]">
          <Select label="Tipo" {...register(`${currentSectionPath}.tipo`)}>
            {SECTION_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Input label="Título" {...register(`${currentSectionPath}.titulo`)} />
        </div>
        <textarea {...register(`${currentSectionPath}.descricao`)} placeholder="Resumo deste módulo" className="mt-4 min-h-20 w-full border border-border bg-recessed p-3 text-sm outline-none focus:border-accent" />

        <div className="mt-12 space-y-8">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-ink-primary">Conteúdos</h4>
            <Button type="button" variant="outline" size="sm" onClick={() => { setValue(`${currentSectionPath}.itens`, [...items, newExperienceItem(items.length)], { shouldDirty: true }); }}><Plus size={14} /> Adicionar conteúdo</Button>
          </div>
          {items.map((item, itemIndex) => {
            const currentItemPath = itemPath(activeIndex, itemIndex);
            return (
              <article key={item.id} className="space-y-5 border-t border-border pt-8 first:border-t-0 first:pt-0">
                <div className="grid gap-3 md:grid-cols-[150px_1fr_auto]">
                  <Select label="Formato" {...register(`${currentItemPath}.tipo`)}>
                    {ITEM_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                  <Input label="Título" {...register(`${currentItemPath}.titulo`)} />
                  <Button type="button" variant="ghost" size="sm" className="self-end text-accent-danger" onClick={() => { setValue(`${currentSectionPath}.itens`, items.filter((_, index) => index !== itemIndex).map((current, ordem) => ({ ...current, ordem })), { shouldDirty: true }); }}><Trash2 size={16} /></Button>
                </div>
                <textarea {...register(`${currentItemPath}.conteudo`)} placeholder="Conteúdo, descrição ou URL externa" className="mt-3 min-h-28 w-full border border-border bg-recessed p-3 text-sm outline-none focus:border-accent" />
                <div>
                  <p className="mb-3 text-xs font-bold uppercase text-ink-tertiary">Mídia</p>
                  {watch(`${currentItemPath}.mediaUrl`) ? (
                    <MediaPreview
                      item={item}
                      url={watch(`${currentItemPath}.mediaUrl`) ?? ''}
                      onRemove={() => { setValue(`${currentItemPath}.mediaUrl`, undefined, { shouldDirty: true }); }}
                    />
                  ) : (
                    <BuilderUploadZone
                      accept={item.tipo === 'video' ? 'video/*' : item.tipo === 'audio' ? 'audio/*' : item.tipo === 'pdf' ? 'application/pdf' : 'image/*,application/pdf,video/*,audio/*'}
                      onUploadComplete={(urls) => {
                        const uploadedUrl = urls[0];
                        if (uploadedUrl) setValue(`${currentItemPath}.mediaUrl`, uploadedUrl, { shouldDirty: true });
                      }}
                    />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
