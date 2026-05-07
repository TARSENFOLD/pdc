import { UseFormRegister, UseFieldArrayReturn } from 'react-hook-form';
import { Card, Input, Button } from '@/components/ui';
import { Plus, Trash2, BookOpen, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CriarCursoPayload } from '@pdc/shared';

interface Props {
  register: UseFormRegister<CriarCursoPayload>;
  modulosArray: UseFieldArrayReturn<CriarCursoPayload, 'modulos'>;
}

function moduloPath(index: number, field: 'titulo') {
  return ['modulos', index, field].join('.') as `modulos.${number}.${typeof field}`;
}

function itemPath(index: number, itemIndex: number, field: 'tipo' | 'titulo') {
  return ['modulos', index, 'itens', itemIndex, field].join('.') as `modulos.${number}.itens.${number}.${typeof field}`;
}

export function CourseCurriculum({ register, modulosArray }: Props) {
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
                    
                    {/* Conteúdos do Módulo */}
                    <div className="pl-4 border-l-2 border-white/5 space-y-3">
                       <div className="flex items-center gap-2 text-[10px] font-black text-ink-tertiary uppercase tracking-widest mb-2">
                         <BookOpen size={12} /> Conteúdos do Módulo
                       </div>
                       <div className="flex gap-3">
	                         <select {...register(itemPath(index, 0, 'tipo'))} className="bg-canvas border border-white/10 rounded-lg px-3 py-1 text-xs">
                           <option value="video">🎥 Vídeo</option>
                           <option value="tarefa">🛠️ Tarefa Prática</option>
                           <option value="quiz">🧠 Quiz</option>
                           <option value="texto">📄 Texto</option>
                         </select>
	                         <Input className="h-8 text-xs bg-canvas/50" {...register(itemPath(index, 0, 'titulo'))} placeholder="Título do Conteúdo" />
                       </div>
                    </div>
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
