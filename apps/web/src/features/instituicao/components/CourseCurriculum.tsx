import { Control, UseFormRegister, UseFieldArrayReturn, useFieldArray, UseFormSetValue } from 'react-hook-form';
import { Card, Input, Button } from '@/components/ui';
import { Plus, Trash2, BookOpen, Layers, Link as LinkIcon, FileUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CriarCursoPayload } from '@pdc/shared';
import { SovereignMediaUpload } from './SovereignMediaUpload';

interface Props {
  register: UseFormRegister<CriarCursoPayload>;
  control: Control<CriarCursoPayload>;
  setValue: UseFormSetValue<CriarCursoPayload>;
  modulosArray: UseFieldArrayReturn<CriarCursoPayload, 'modulos'>;
}

function moduloPath(index: number, field: 'titulo') {
  return ['modulos', index, field].join('.') as `modulos.${number}.${typeof field}`;
}

function itemPath(index: number, itemIndex: number, field: 'tipo' | 'titulo' | 'conteudo' | 'url') {
  return ['modulos', index, 'itens', itemIndex, field].join('.') as `modulos.${number}.itens.${number}.${typeof field}`;
}

function ModuleItemsEditor({
  register,
  control,
  setValue,
  moduleIndex,
}: {
  register: UseFormRegister<CriarCursoPayload>;
  control: Control<CriarCursoPayload>;
  setValue: UseFormSetValue<CriarCursoPayload>;
  moduleIndex: number;
}) {
  const itemsName = `modulos.${moduleIndex.toString()}.itens` as `modulos.${number}.itens`;
  const itemsArray = useFieldArray({
    control,
    name: itemsName,
  });

  return (
    <div className="pl-4 border-l-2 border-white/5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black text-ink-tertiary uppercase tracking-widest">
          <BookOpen size={12} /> Conteúdos do Módulo
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            itemsArray.append({
              titulo: `Novo Conteúdo ${String(itemsArray.fields.length + 1)}`,
              tipo: 'texto',
              ordem: itemsArray.fields.length + 1,
              conteudo: '',
            });
          }}
          className="gap-2 text-[10px]"
        >
          <Plus size={14} /> Adicionar Item
        </Button>
      </div>

      {itemsArray.fields.map((item, itemIndex) => (
        <div key={item.id} className="rounded-xl border border-white/10 bg-canvas/40 p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-[140px_1fr_auto]">
            <select {...register(itemPath(moduleIndex, itemIndex, 'tipo'))} className="bg-canvas border border-white/10 rounded-lg px-3 py-2 text-xs">
              <option value="video">Vídeo</option>
              <option value="pdf">PDF</option>
              <option value="iframe">Iframe</option>
              <option value="tarefa">Tarefa</option>
              <option value="quiz">Quiz</option>
              <option value="texto">Texto</option>
            </select>
            <Input className="h-10 text-xs bg-canvas/50" {...register(itemPath(moduleIndex, itemIndex, 'titulo'))} placeholder="Título do Conteúdo" />
            <button
              type="button"
              onClick={() => { itemsArray.remove(itemIndex); }}
              className="text-error p-2 hover:bg-error/10 rounded-lg"
              aria-label="Remover item"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase text-ink-tertiary"><LinkIcon size={12} /> URL / Embed</span>
              <Input className="h-10 text-xs bg-canvas/50" {...register(itemPath(moduleIndex, itemIndex, 'url'))} placeholder="https://..." />
            </label>
            <div className="space-y-1">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase text-ink-tertiary"><FileUp size={12} /> Upload</span>
              <SovereignMediaUpload
                accept="image/*,video/mp4,application/pdf"
                maxSizeMB={50}
                entityType="generic"
                onSuccess={(url) => {
                  setValue(itemPath(moduleIndex, itemIndex, 'url'), url, { shouldDirty: true, shouldValidate: true });
                }}
              />
            </div>
          </div>

          <label className="space-y-1 block">
            <span className="text-[10px] font-bold uppercase text-ink-tertiary">Texto / Instruções / Conteúdo Richtext</span>
            <textarea
              {...register(itemPath(moduleIndex, itemIndex, 'conteudo'))}
              className="min-h-24 w-full rounded-xl border border-white/10 bg-canvas/50 px-4 py-3 text-xs outline-none transition-all focus:border-accent"
              placeholder="Conteúdo textual, instruções da tarefa ou descrição do recurso."
            />
          </label>
        </div>
      ))}
    </div>
  );
}

export function CourseCurriculum({ register, control, setValue, modulosArray }: Props) {
  const { fields: modulos, append: appendModulo, remove: removeModulo } = modulosArray;

  return (
    <section>
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Layers size={20} /></div>
          <h2 className="text-xl font-bold">Músculo Curricular</h2>
        </div>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={() => { appendModulo({ titulo: `Novo Módulo ${String(modulos.length + 1)}`, ordem: modulos.length + 1, itens: [{ titulo: 'Novo Conteúdo', tipo: 'texto', ordem: 1 }] }); }} 
          className="gap-2"
        >
          <Plus size={16} /> Adicionar Módulo
        </Button>
      </div>

      <div className="space-y-6">
        <AnimatePresence>
          {modulos.map((modulo, index) => (
            <motion.div
              key={modulo.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="p-6 border-white/5 bg-recessed/30 relative group">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-accent">{index + 1}</div>
                  <div className="flex-1 space-y-4">
                    <div className="flex gap-4">
	                      <Input className="bg-transparent border-b border-t-0 border-x-0 rounded-none focus:border-accent" {...register(moduloPath(index, 'titulo'))} placeholder="Nome do Módulo" />
                      <button type="button" onClick={() => { removeModulo(index); }} className="text-error opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-error/10 rounded-lg">
                        <Trash2 size={20} />
                      </button>
                    </div>
                    
                    <ModuleItemsEditor register={register} control={control} setValue={setValue} moduleIndex={index} />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
