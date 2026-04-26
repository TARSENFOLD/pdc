import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Card, Input } from '@/components/ui';
import { Layout, Image as ImageIcon } from 'lucide-react';
import { AreaVocacionalSchema, type CriarCursoPayload } from '@pdc/shared';
import { SovereignMediaUpload } from './SovereignMediaUpload';

interface Props {
  register: UseFormRegister<CriarCursoPayload>;
  errors: FieldErrors<CriarCursoPayload>;
  onCapaUploaded: (url: string) => void;
}

export function CourseBaseInfo({ register, errors, onCapaUploaded }: Props) {
  return (
    <Card className="p-8 border-white/5 bg-surface/50 backdrop-blur-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-accent/10 rounded-lg text-accent"><Layout size={20} /></div>
        <h2 className="text-xl font-bold">Estrutura Soberana</h2>
      </div>
      
      <div className="space-y-6">
        <Input label="Título do Desafio" {...register('titulo')} error={errors.titulo?.message} placeholder="Ex: Engenharia de Prompt de Elite" />
        
        <div className="space-y-1">
          <label className="text-sm font-medium opacity-70">Manifesto do Curso</label>
          <textarea 
            className="flex min-h-25 w-full rounded-xl border border-white/10 bg-surface-alt px-4 py-3 text-sm focus:border-accent outline-none transition-all"
            {...register('descricao')}
            placeholder="O que o estudante irá conquistar?"
          />
          {errors.descricao && <p className="text-xs text-error">{errors.descricao.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-1">
              <label className="text-sm font-medium opacity-70">Área Vocacional</label>
              <select {...register('area')} className="w-full bg-surface-alt border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-accent transition-all">
                {AreaVocacionalSchema.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
           </div>
           <div className="space-y-1">
              <label className="text-sm font-medium opacity-70">Nível de Rigor</label>
              <select {...register('nivel')} className="w-full bg-surface-alt border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-accent transition-all">
                <option value="basico">Básico (Iniciação)</option>
                <option value="medio">Médio (Competência)</option>
                <option value="avancado">Avançado (Mestria)</option>
              </select>
           </div>
        </div>

        {/* Upload E2E G8 Integrado */}
        <div className="space-y-1 mt-4">
           <label className="text-sm font-medium opacity-70 flex items-center gap-2"><ImageIcon size={14} /> Capa do Curso</label>
           <SovereignMediaUpload 
             onSuccess={onCapaUploaded} 
             accept="image/jpeg, image/png, image/webp" 
             maxSizeMB={5} 
           />
           {/* Campo oculto que guardará a URL final */}
           <input type="hidden" {...register('capaUrl')} />
        </div>
      </div>
    </Card>
  );
}
