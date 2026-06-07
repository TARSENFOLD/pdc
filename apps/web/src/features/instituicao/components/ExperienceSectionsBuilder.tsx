import { useFieldArray, type Control, type UseFormRegister, type UseFormSetValue, type UseFormWatch } from 'react-hook-form';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
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

export function ExperienceSectionsBuilder({ control, register, watch, setValue }: Props) {
  const sections = useFieldArray({ control, name: 'secoes', keyName: 'fieldKey' });

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.fields.length) return;
    sections.swap(index, target);
    const next = watch('secoes').map((section, ordem) => ({ ...section, ordem }));
    setValue('secoes', next, { shouldDirty: true });
  };

  return (
    <div className="space-y-5">
      {sections.fields.map((section, sectionIndex) => {
        const currentSectionPath = sectionPath(sectionIndex);
        const items = watch(`${currentSectionPath}.itens`);
        return (
          <section key={section.fieldKey} className="border border-ink-tertiary/15 bg-canvas p-5">
            <div className="grid gap-4 lg:grid-cols-[180px_1fr_auto]">
              <Select label="Tipo de módulo" {...register(`${currentSectionPath}.tipo`)}>
                {SECTION_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
              <Input label="Título do módulo" {...register(`${currentSectionPath}.titulo`)} />
              <div className="flex items-end gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => { move(sectionIndex, -1); }} aria-label="Mover módulo para cima"><ChevronUp size={16} /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { move(sectionIndex, 1); }} aria-label="Mover módulo para baixo"><ChevronDown size={16} /></Button>
                <Button type="button" variant="ghost" size="sm" className="text-accent-danger" onClick={() => { sections.remove(sectionIndex); }} aria-label="Remover módulo"><Trash2 size={16} /></Button>
              </div>
            </div>

            <textarea
              {...register(`${currentSectionPath}.descricao`)}
              placeholder="Explique o propósito deste módulo."
              className="mt-4 min-h-20 w-full border border-ink-tertiary/15 bg-recessed p-3 text-sm outline-none focus:border-accent"
            />

            <div className="mt-5 space-y-4 border-l-2 border-accent/25 pl-4">
              {items.map((item, itemIndex) => {
                const currentItemPath = itemPath(sectionIndex, itemIndex);
                const mediaUrl = watch(`${currentItemPath}.mediaUrl`);
                return (
                  <div key={item.id} className="space-y-3 border-b border-ink-tertiary/10 pb-5">
                    <div className="grid gap-3 md:grid-cols-[160px_1fr_auto]">
                      <Select label="Conteúdo" {...register(`${currentItemPath}.tipo`)}>
                        {ITEM_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </Select>
                      <Input label="Título" {...register(`${currentItemPath}.titulo`)} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="self-end text-accent-danger"
                        onClick={() => {
                          setValue(
                            `${currentSectionPath}.itens`,
                            items.filter((_, index) => index !== itemIndex).map((current, ordem) => ({ ...current, ordem })),
                            { shouldDirty: true },
                          );
                        }}
                        aria-label="Remover conteúdo"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    <textarea
                      {...register(`${currentItemPath}.conteudo`)}
                      placeholder="Texto, descrição, pergunta/resposta ou URL externa."
                      className="min-h-24 w-full border border-ink-tertiary/15 bg-recessed p-3 text-sm outline-none focus:border-accent"
                    />
                    <BuilderUploadZone
                      onUploadComplete={(urls) => {
                        const url = urls[0];
                        if (url) setValue(`${currentItemPath}.mediaUrl`, url, { shouldDirty: true });
                      }}
                    />
                    {mediaUrl && (
                      <div className="flex items-center gap-3 border border-emerald-500/25 bg-emerald-500/5 p-3">
                        {item.tipo === 'imagem' || item.tipo === 'galeria'
                          ? <img src={mediaUrl} alt="" className="h-16 w-24 object-cover" />
                          : <span className="min-w-0 flex-1 truncate text-xs text-emerald-500">{mediaUrl}</span>}
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setValue(`${currentItemPath}.mediaUrl`, undefined, { shouldDirty: true }); }}>Remover</Button>
                      </div>
                    )}
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setValue(`${currentSectionPath}.itens`, [...items, newExperienceItem(items.length)], { shouldDirty: true });
                }}
              >
                <Plus size={15} /> Adicionar conteúdo
              </Button>
            </div>
          </section>
        );
      })}

      <div className="flex flex-wrap gap-2 border-t border-ink-tertiary/15 pt-5">
        {SECTION_TYPES.map((option) => (
          <Button key={option.value} type="button" variant="outline" size="sm" onClick={() => { sections.append(newExperienceSection(option.value, sections.fields.length, option.label)); }}>
            <Plus size={14} /> {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
