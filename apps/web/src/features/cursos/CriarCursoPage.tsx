import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { useUpload } from '@/hooks/useUpload';
import { 
  ArrowLeft, 
  Layout
} from 'lucide-react';
import { http } from '@/lib/api/http';

import { AnimatePresence } from 'motion/react';
import type { CriarCursoPayload, StrapiSingleResponse, Curso } from '@pdc/shared';
import { CursoFormStep1 } from './components/CursoFormStep1';
import { CursoFormStep2 } from './components/CursoFormStep2';
import { CursoFormSidebar } from './components/CursoFormSidebar';

export const CriarCursoPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { upload, isUploading, progress } = useUpload();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [payload, setPayload] = useState<Partial<CriarCursoPayload>>({
    titulo: '',
    descricao: '',
    area: 'TECNOLOGIA',
    nivel: 'basico',
    visibilidade: 'publico',
    thumbnailUrl: '',
    regrasAcesso: {
      minFluidez: 0,
      minResiliencia: 0,
      minFoco: 0,
    },
  });

  const [modulos, setModulos] = useState<Array<{ titulo: string; itens: Array<{ titulo: string; tipo: string; conteudo: string }> }>>([]);

  const handleSave = async () => {
    if (!payload.titulo || !payload.descricao) return;
    setLoading(true);
    try {
      const fullPayload: CriarCursoPayload = {
        titulo: payload.titulo || '',
        descricao: payload.descricao || '',
        area: payload.area || 'TECNOLOGIA',
        nivel: payload.nivel || 'basico',
        visibilidade: payload.visibilidade || 'publico',
        thumbnailUrl: payload.thumbnailUrl || '',
        gratuito: true, // Default per Spec 04
        preco: 0,
        comissao: 0,
        requerValidacaoComite: false,
        regrasAcesso: {
          minFluidez: payload.regrasAcesso?.minFluidez ?? 0,
          minResiliencia: payload.regrasAcesso?.minResiliencia ?? 0,
          minFoco: payload.regrasAcesso?.minFoco ?? 0
        },
        modulos: modulos.map((m, idx) => ({
          titulo: m.titulo,
          ordem: idx,
          itens: m.itens.map((item, iIdx) => ({
            titulo: item.titulo,
            tipo: item.tipo as "video" | "pdf" | "texto",
            ordem: iIdx,
            conteudo: item.conteudo
          }))
        }))
      };

      const res = await http.post<StrapiSingleResponse<Curso>>('/cursos', fullPayload);
      const cursoId = res.data.id;
      navigate(`/app/cursos/${cursoId}`);
    } catch (err) {
      console.error('Falha ao materializar curso:', err);
      toast({
        title: 'Erro ao materializar curso',
        description: err instanceof Error ? err.message : 'Ocorreu um erro inesperado na Camada 3 (BFF).',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-32 px-4 animate-in fade-in duration-700">
      
      <nav className="flex items-center justify-between pt-12">
        <button onClick={() => { navigate(-1); }} className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-ink-tertiary hover:text-accent transition-all">
          <div className="h-8 w-8 rounded-full border border-ink-tertiary/10 flex items-center justify-center group-hover:border-accent/30 transition-colors">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
          </div>
          Cancelar Construção
        </button>
        <div className="px-4 py-1.5 rounded-full bg-accent/5 border border-accent/10 text-[10px] font-mono font-bold text-accent uppercase tracking-widest">
          Status: Arquitetura Inicial
        </div>
      </nav>

      <header>
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-[11px] font-black uppercase tracking-[0.2em] mb-6">
          <Layout size={16} /> Oficina de Conteúdo Soberano
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-ink-primary sm:text-7xl font-display leading-[0.9]">
           Materializar <br /> <span className="text-accent italic">Conhecimento.</span>
        </h1>
        <p className="text-ink-secondary mt-6 text-xl font-medium max-w-2xl leading-relaxed opacity-80">
          Define a identidade, as regras de mérito e a trilha biomecânica do teu curso.
        </p>
      </header>

      <div className="flex gap-2">
         {[1, 2].map(i => (
           <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-accent' : 'bg-border'}`} />
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
           <AnimatePresence mode="wait">
             {step === 1 ? (
               <CursoFormStep1 
                 payload={payload} 
                 setPayload={setPayload} 
                 upload={upload} 
                 isUploading={isUploading} 
                 progress={progress} 
               />
             ) : (
               <CursoFormStep2 
                 modulos={modulos} 
                 setModulos={setModulos} 
               />
             )}
           </AnimatePresence>
        </div>

        <CursoFormSidebar 
          payload={payload} 
          setPayload={setPayload} 
          step={step} 
          setStep={setStep} 
          loading={loading} 
          onSave={handleSave} 
        />
      </div>
    </div>
  );
};
