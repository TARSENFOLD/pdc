import { useEffect, useState } from 'react';
import { useFieldArray, type Control, type UseFormRegister, type UseFormSetValue, type UseFormWatch } from 'react-hook-form';
import { ChevronDown, ChevronUp, FileText, Image, Music, Plus, Trash2, Video } from 'lucide-react';
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

export function ExperienceSectionsBuilder({ control, register, watch, setValue }: Props) {
  const sections = useFieldArray({ control, name: 'secoes', keyName: 'fieldKey' });
  const [activeIndex, setActiveIndex] = useState(0);
  const [newType, setNewType] = useState<ExperienciaSecao['tipo']>('personalizado');

  useEffect(() => {
    if (activeIndex >= sections.fields.length) setActiveIndex(Math.max(0, sections.fields.length - 1));
  }, [activeIndex, sections.fields.length]);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.fields.length) return;
    sections.swap(index, target);
    setActiveIndex(target);
    setValue('secoes', watch('secoes').map((section, ordem) => ({ ...section, ordem })), { shouldDirty: true });
  };

  const activeSection = sections.fields[activeIndex];
  if (!activeSection) {
    return (
      <div className="border border-dashed border-border p-10 text-center">
        <p className="text-sm text-ink-secondary">Ainda não existem módulos.</p>
        <Button type="button" className="mt-4" onClick={() => { sections.append(newExperienceSection('boas_vindas', 0, 'Boas-vindas')); }}>Criar primeiro módulo</Button>
      </div>
    );
  }

  const currentSectionPath = sectionPath(activeIndex);
  const items = watch(`${currentSectionPath}.itens`);

  return (
    <div className="grid min-h-[620px] overflow-hidden border border-border lg:grid-cols-[230px_minmax(0,1fr)_280px]">
      <aside className="border-b border-border bg-recessed/35 p-3 lg:border-b-0 lg:border-r">
        <p className="px-2 pb-3 text-xs font-bold uppercase text-ink-tertiary">Estrutura</p>
        <div className="space-y-1">
          {sections.fields.map((section, index) => (
            <button
              key={section.fieldKey}
              type="button"
              onClick={() => { setActiveIndex(index); }}
              className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm ${activeIndex === index ? 'bg-accent/10 text-accent' : 'text-ink-secondary hover:bg-elevated'}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-[10px]">{String(index + 1)}</span>
              <span className="line-clamp-2">{watch(`${sectionPath(index)}.titulo`)}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <Select aria-label="Tipo do novo módulo" value={newType} onChange={(event) => { setNewType(event.target.value as ExperienciaSecao['tipo']); }}>
            {SECTION_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              const label = SECTION_TYPES.find((option) => option.value === newType)?.label ?? 'Novo módulo';
              sections.append(newExperienceSection(newType, sections.fields.length, label));
              setActiveIndex(sections.fields.length);
            }}
          >
            <Plus size={14} /> Adicionar módulo
          </Button>
        </div>
      </aside>

      <main className="min-w-0 p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
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

        <div className="mt-6 grid gap-4 md:grid-cols-[180px_1fr]">
          <Select label="Tipo" {...register(`${currentSectionPath}.tipo`)}>
            {SECTION_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Input label="Título" {...register(`${currentSectionPath}.titulo`)} />
        </div>
        <textarea {...register(`${currentSectionPath}.descricao`)} placeholder="Resumo deste módulo" className="mt-4 min-h-20 w-full border border-border bg-recessed p-3 text-sm outline-none focus:border-accent" />

        <div className="mt-8 space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-ink-primary">Conteúdos</h4>
            <Button type="button" variant="outline" size="sm" onClick={() => { setValue(`${currentSectionPath}.itens`, [...items, newExperienceItem(items.length)], { shouldDirty: true }); }}><Plus size={14} /> Adicionar conteúdo</Button>
          </div>
          {items.map((item, itemIndex) => {
            const currentItemPath = itemPath(activeIndex, itemIndex);
            return (
              <article key={item.id} className="border border-border p-4">
                <div className="grid gap-3 md:grid-cols-[150px_1fr_auto]">
                  <Select label="Formato" {...register(`${currentItemPath}.tipo`)}>
                    {ITEM_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                  <Input label="Título" {...register(`${currentItemPath}.titulo`)} />
                  <Button type="button" variant="ghost" size="sm" className="self-end text-accent-danger" onClick={() => { setValue(`${currentSectionPath}.itens`, items.filter((_, index) => index !== itemIndex).map((current, ordem) => ({ ...current, ordem })), { shouldDirty: true }); }}><Trash2 size={16} /></Button>
                </div>
                <textarea {...register(`${currentItemPath}.conteudo`)} placeholder="Conteúdo, descrição ou URL externa" className="mt-3 min-h-28 w-full border border-border bg-recessed p-3 text-sm outline-none focus:border-accent" />
              </article>
            );
          })}
        </div>
      </main>

      <aside className="border-t border-border bg-recessed/25 p-5 lg:border-l lg:border-t-0">
        <p className="text-xs font-bold uppercase text-ink-tertiary">Mídia do conteúdo</p>
        <p className="mt-2 text-xs leading-5 text-ink-secondary">Selecione um conteúdo abaixo para carregar e rever a mídia.</p>
        <div className="mt-5 space-y-5">
          {items.map((item, itemIndex) => {
            const currentItemPath = itemPath(activeIndex, itemIndex);
            const url = watch(`${currentItemPath}.mediaUrl`);
            const Icon = item.tipo === 'video' ? Video : item.tipo === 'audio' ? Music : item.tipo === 'imagem' || item.tipo === 'galeria' ? Image : FileText;
            return (
              <div key={item.id}>
                <div className="mb-2 flex items-center gap-2">
                  <Icon size={14} className="text-accent" />
                  <span className="truncate text-xs font-semibold text-ink-primary">{item.titulo}</span>
                </div>
                {url ? (
                  <MediaPreview item={item} url={url} onRemove={() => { setValue(`${currentItemPath}.mediaUrl`, undefined, { shouldDirty: true }); }} />
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
            );
          })}
        </div>
      </aside>
    </div>
  );
}
