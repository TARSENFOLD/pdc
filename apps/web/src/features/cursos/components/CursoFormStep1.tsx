import { useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { Card, Input } from '@/components/ui';
import { motion } from 'motion/react';
import type { CriarCursoPayload, AreaVocacional } from '@pdc/shared';

interface Props {
  payload: Partial<CriarCursoPayload>;
  setPayload: (p: Partial<CriarCursoPayload>) => void;
  upload: (file: File) => Promise<{ url: string } | null>;
  isUploading: boolean;
  progress: number;
}

export const CursoFormStep1 = ({ payload, setPayload, upload, isUploading, progress }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await upload(file);
      if (result) {
        setPayload({ ...payload, thumbnailUrl: result.url });
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <motion.div 
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <Card className="p-10 bg-surface border-border shadow-2xl rounded-[40px]">
        <div className="space-y-6">
          {/* Upload de Capa */}
          <div 
            className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-[32px] bg-surface-raised/30 group hover:border-accent/50 transition-all cursor-pointer relative overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
          >
            {payload.thumbnailUrl ? (
              <img src={payload.thumbnailUrl} alt="Capa" className="absolute inset-0 w-full h-full object-cover opacity-40" />
            ) : null}
            
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { void handleFileUpload(e); }} />
            
            <div className="relative z-10 flex flex-col items-center">
              {isUploading ? (
                <>
                  <div className="h-12 w-12 rounded-full border-4 border-accent/20 border-t-accent animate-spin mb-4" />
                  <span className="text-xs font-black text-accent uppercase tracking-widest">{progress}%</span>
                </>
              ) : (
                <>
                  <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform">
                    <UploadCloud size={32} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Capa do Curso (1280x720)</span>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3 block">Título do Curso</label>
            <Input 
              value={payload.titulo} 
              onChange={e => { setPayload({...payload, titulo: e.target.value}); }}
              placeholder="Ex: Engenharia de Prompt para Decisores"
              className="text-2xl font-bold h-16 bg-surface-raised/50 border-border"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3 block">Descrição Provocativa</label>
            <textarea 
              className="w-full bg-surface-raised/50 border border-border rounded-2xl p-4 text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none min-h-[160px] transition-all"
              placeholder="O que o estudante será capaz de fazer após este curso?"
              value={payload.descricao}
              onChange={e => { setPayload({...payload, descricao: e.target.value}); }}
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3 block">Área Vocacional</label>
              <select
                className="w-full bg-surface-raised/50 border border-border rounded-xl p-4 text-text-primary"
                value={payload.area || ''}
                onChange={e => { 
                  const val = e.target.value;
                  setPayload({...payload, area: val ? (val as AreaVocacional) : undefined}); 
                }}
              >
                <option value="" disabled>Selecione uma área</option>
                <option value="SAUDE">Saúde</option>
                <option value="ENGENHARIA">Engenharia</option>
                <option value="TECNOLOGIA">Tecnologia</option>
                <option value="DIREITO">Direito</option>
                <option value="GESTAO">Gestão</option>
                <option value="EDUCACAO">Educação</option>
                <option value="ARTES">Artes</option>
                <option value="CIENCIAS_AGRARIAS">Ciências Agrárias</option>
                <option value="CIENCIAS_SOCIAIS">Ciências Sociais</option>
                <option value="COMUNICACAO">Comunicação</option>
                <option value="CIENCIAS_NATURAIS">Ciências Naturais</option>
                <option value="ARQUITETURA">Arquitetura</option>
                <option value="TURISMO_HOTELARIA">Turismo e Hotelaria</option>
                <option value="DESPORTO">Desporto</option>
                <option value="OUTRA">Outra</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3 block">Nível de Rigor</label>
              <select 
                className="w-full bg-surface-raised/50 border border-border rounded-xl p-4 text-text-primary"
                value={payload.nivel}
                onChange={e => { setPayload({...payload, nivel: e.target.value as "basico" | "medio" | "avancado"}); }}
              >
                <option value="basico">Básico (Exploratório)</option>
                <option value="medio">Médio (Profissional)</option>
                <option value="avancado">Avançado (Elite)</option>
              </select>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
