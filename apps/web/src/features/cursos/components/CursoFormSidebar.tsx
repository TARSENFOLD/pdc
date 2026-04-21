import { ShieldCheck, ChevronRight, Save, Brain } from 'lucide-react';
import { Card, Button, Spinner } from '@/components/ui';
import type { CriarCursoPayload } from '@pdc/shared';

interface Props {
  payload: Partial<CriarCursoPayload>;
  setPayload: (p: Partial<CriarCursoPayload>) => void;
  step: number;
  setStep: (s: number) => void;
  loading: boolean;
  onSave: () => Promise<void>;
}

export const CursoFormSidebar = ({ payload, setPayload, step, setStep, loading, onSave }: Props) => {
  const minFluidez = payload.regrasAcesso?.minFluidez ?? 4;
  const minResiliencia = payload.regrasAcesso?.minResiliencia ?? 5;

  return (
    <div className="lg:col-span-4 space-y-8">
      <Card className="p-8 bg-surface-alt border-border rounded-[40px] shadow-xl">
        <h3 className="text-[11px] font-black text-text-muted uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
          <ShieldCheck size={14} className="text-accent" /> Regras de Mérito (Match)
        </h3>
        
        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-[10px] font-black uppercase text-text-secondary mb-3">
              <span>Fluidez Mínima (ϕ)</span>
              <span className="text-accent">{minFluidez}</span>
            </div>
            <input 
              type="range" min="0" max="10" step="0.5" 
              className="w-full accent-accent" 
              value={minFluidez}
              onChange={e => { 
                setPayload({
                  ...payload, 
                  regrasAcesso: {
                    minResiliencia,
                    minFluidez: Number(e.target.value)
                  }
                }); 
              }}
            />
            <p className="text-[9px] text-text-muted mt-2">Só estudantes com este nível de ritmo biomecânico verão o curso.</p>
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-black uppercase text-text-secondary mb-3">
              <span>Resiliência Mínima (R)</span>
              <span className="text-emerald-500">{minResiliencia}</span>
            </div>
            <input 
              type="range" min="0" max="10" step="0.5" 
              className="w-full accent-emerald-500" 
              value={minResiliencia}
              onChange={e => { 
                setPayload({
                  ...payload, 
                  regrasAcesso: {
                    minFluidez,
                    minResiliencia: Number(e.target.value)
                  }
                }); 
              }}
            />
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-border">
          <Button 
            onClick={() => {
              if (step < 2) {
                setStep(step + 1);
              } else {
                void onSave();
              }
            }} 
            className="w-full h-16 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-xs hover:scale-[1.02] shadow-xl shadow-accent/20"
            disabled={loading}
          >
            {loading ? <Spinner /> : step < 2 ? <>Próximo Passo <ChevronRight size={16} className="ml-2" /></> : <>Publicar Curso <Save size={16} className="ml-2" /></>}
          </Button>
        </div>
      </Card>

      <Card className="p-8 bg-accent/5 border border-accent/20 rounded-[40px]">
        <div className="flex items-center gap-3 text-accent mb-4">
          <Brain size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest">IA Co-Piloto (TINA)</span>
        </div>
        <p className="text-xs text-text-primary leading-relaxed font-medium">
          "Estou pronta para gerar o resumo do syllabus e sugerir o match vocacional assim que publicares o conteúdo."
        </p>
      </Card>
    </div>
  );
};
