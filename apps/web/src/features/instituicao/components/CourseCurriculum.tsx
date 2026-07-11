import { Control, UseFormRegister, UseFieldArrayReturn, useFieldArray, UseFormSetValue } from 'react-hook-form';
import { Input, Button } from '@/components/ui';
import { Plus, Trash2, BookOpen, Layers, Link as LinkIcon, FileUp, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CriarCursoPayload } from '@pdc/shared';
import { SovereignMediaUpload } from './SovereignMediaUpload';
import { videosApi } from '@/lib/api/videos';
import { useState } from 'react';

interface Props {
  register: UseFormRegister<CriarCursoPayload>;
  control: Control<CriarCursoPayload>;
  setValue: UseFormSetValue<CriarCursoPayload>;
  modulosArray: UseFieldArrayReturn<CriarCursoPayload, 'modulos'>;
}

function moduloPath(index: number, field: 'titulo') {
  return ['modulos', index, field].join('.') as `modulos.${number}.${typeof field}`;
}

function itemPath(index: number, itemIndex: number, field: 'tipo' | 'titulo' | 'conteudo' | 'url' | 'videoId') {
  return ['modulos', index, 'itens', itemIndex, field].join('.') as `modulos.${number}.itens.${number}.${typeof field}`;
}

function CourseVideoUpload({
  title,
  onVideoReady,
}: {
  title: string;
  onVideoReady: (videoId: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file || isUploading) return;
    setError(null);
    setIsUploading(true);
    try {
      const video = await videosApi.uploadQuickR2(file, title.trim() || file.name);
      onVideoReady(video.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no upload do vídeo');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <label className="block space-y-1">
      <span className="flex items-center gap-2 text-xs font-semibold text-ink-secondary"><Video size={12} /> Vídeo PDC</span>
      <input
        type="file"
        accept="video/mp4"
        disabled={isUploading}
        onChange={(event) => { void upload(event.target.files?.[0]); }}
        className="block w-full text-xs text-ink-secondary file:mr-3 file:min-h-10 file:rounded-sm file:border file:border-border file:bg-canvas file:px-3 file:text-xs file:font-semibold file:text-ink-primary disabled:opacity-60"
      />
      {isUploading ? <p className="text-xs text-ink-tertiary">A enviar vídeo...</p> : null}
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </label>
  );
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
    <div className="space-y-4 border-l border-border pl-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink-secondary">
          <BookOpen size={14} /> Conteúdos do módulo
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
          className="gap-2 text-xs"
        >
          <Plus size={14} /> Adicionar Item
        </Button>
      </div>

      {itemsArray.fields.map((item, itemIndex) => (
        <div key={item.id} className="space-y-4 border-t border-border py-5 first:border-t-0">
          <div className="grid gap-3 md:grid-cols-[140px_1fr_auto]">
            <select {...register(itemPath(moduleIndex, itemIndex, 'tipo'))} className="min-h-10 rounded-sm border border-border bg-canvas px-3 text-xs text-ink-primary">
              <option value="video">Vídeo</option>
              <option value="pdf">PDF</option>
              <option value="iframe">Iframe</option>
              <option value="tarefa">Tarefa</option>
              <option value="quiz">Quiz</option>
              <option value="texto">Texto</option>
            </select>
            <Input className="h-10 bg-canvas text-xs" {...register(itemPath(moduleIndex, itemIndex, 'titulo'))} />
            <button
              type="button"
              onClick={() => { itemsArray.remove(itemIndex); }}
              className="min-h-10 min-w-10 p-2 text-error hover:bg-error/10"
              aria-label="Remover item"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1">
              <span className="flex items-center gap-2 text-xs font-semibold text-ink-secondary"><LinkIcon size={12} /> URL ou embed</span>
              <Input className="h-10 bg-canvas text-xs" {...register(itemPath(moduleIndex, itemIndex, 'url'))} />
            </label>
            <label className="space-y-1">
              <span className="flex items-center gap-2 text-xs font-semibold text-ink-secondary"><Video size={12} /> Video ID</span>
              <Input className="h-10 bg-canvas text-xs" {...register(itemPath(moduleIndex, itemIndex, 'videoId'))} />
            </label>
            <div className="space-y-1">
              <span className="flex items-center gap-2 text-xs font-semibold text-ink-secondary"><FileUp size={12} /> Ficheiro</span>
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
          <CourseVideoUpload
            title={item.titulo}
            onVideoReady={(videoId) => {
              setValue(itemPath(moduleIndex, itemIndex, 'videoId'), videoId, { shouldDirty: true, shouldValidate: true });
            }}
          />

          <label className="space-y-1 block">
            <span className="text-xs font-semibold text-ink-secondary">Texto ou instruções</span>
            <textarea
              {...register(itemPath(moduleIndex, itemIndex, 'conteudo'))}
              className="min-h-28 w-full rounded-sm border border-border bg-canvas px-4 py-3 text-sm text-ink-primary outline-none transition-colors focus:border-accent"
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
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Layers size={20} className="text-accent" />
          <h3 className="text-base font-semibold text-ink-primary">Módulos do curso</h3>
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
              <section className="group border-b border-border py-7 first:pt-0">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-sm font-semibold text-accent">{index + 1}</div>
                  <div className="flex-1 space-y-4">
                    <div className="flex gap-4">
	                      <Input className="rounded-none border-x-0 border-t-0 bg-transparent focus:border-accent" {...register(moduloPath(index, 'titulo'))} />
                      <button type="button" onClick={() => { removeModulo(index); }} className="min-h-11 min-w-11 p-2 text-error opacity-70 transition-opacity hover:bg-error/10 group-hover:opacity-100">
                        <Trash2 size={20} />
                      </button>
                    </div>
                    
                    <ModuleItemsEditor register={register} control={control} setValue={setValue} moduleIndex={index} />
                  </div>
                </div>
              </section>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
