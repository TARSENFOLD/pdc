import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  Layout, 
  FileText, 
  UploadCloud, 
  Brain,
  Activity,
  ChevronRight,
  ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import { Card, Button, Input, Spinner } from '@/components/ui';
import { http } from '@/lib/api/http';
import { useUpload } from '@/hooks/useUpload';
import { motion, AnimatePresence } from 'motion/react';
import type { CriarCursoPayload, AreaVocacional } from '@pdc/shared';

export const CriarCursoPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, progress } = useUpload();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // State Soberano do Curso
  const [payload, setPayload] = useState<Partial<CriarCursoPayload>>({
    titulo: '',
    descricao: '',
    area: 'TECNOLOGIA',
    nivel: 'basico',
    visibilidade: 'publico',
    thumbnailUrl: '',
    regrasAcesso: {
      minFluidez: 4,
      minResiliencia: 5
    }
  });

  const [modulos, setModulos] = useState<any[]>([]);

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

  const handleSave = async () => {
    if (!payload.titulo || !payload.descricao) return;
    setLoading(true);
    try {
      // 1. Preparar o Pacote Completo (E2E Sovereign Package)
      const fullPayload = {
        ...payload,
        modulos: modulos.map((m, idx) => ({
          titulo: m.titulo,
          ordem: idx,
          itens: m.itens.map((item: any, iIdx: number) => ({
            titulo: item.titulo,
            tipo: item.tipo,
            ordem: iIdx,
            conteudo: item.conteudo
          }))
        }))
      };

      // 2. Materialização Atómica no BFF (Camada 3)
      const res = await http.post<any>('/cursos', fullPayload);
      const cursoId = res.data.id;
      
      // O impacto no ecossistema (Camada 5) já foi disparado pelo BFF
      navigate(`/app/cursos/${cursoId}`);
    } catch (err) {
      console.error('Falha ao materializar curso:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-32 px-4 animate-in fade-in duration-700">
      
      {/* Nav & Header */}
      <nav className="flex items-center justify-between pt-12">
        <button onClick={() => navigate(-1)} className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted hover:text-accent transition-all">
          <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center group-hover:border-accent/30 transition-colors">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
          </div>
          Cancelar Construção
        </button>
        <div className="flex gap-4">
           <div className="px-4 py-1.5 rounded-full bg-accent/5 border border-accent/10 text-[10px] font-mono font-bold text-accent uppercase tracking-widest">
             Status: Arquitetura Inicial
           </div>
        </div>
      </nav>

      <header>
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-[11px] font-black uppercase tracking-[0.2em] mb-6">
          <Layout size={16} /> Oficina de Conteúdo Soberano
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-text-primary sm:text-7xl font-display leading-[0.9]">
           Materializar <br /> <span className="text-accent italic">Conhecimento.</span>
        </h1>
        <p className="text-text-secondary mt-6 text-xl font-medium max-w-2xl leading-relaxed opacity-80">
          Define a identidade, as regras de mérito e a trilha biomecânica do teu curso.
        </p>
      </header>

      {/* Steps Indicator */}
      <div className="flex gap-2">
         {[1, 2, 3].map(i => (
           <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-accent' : 'bg-border'}`} />
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Main Form Area */}
        <div className="lg:col-span-8">
           <AnimatePresence mode="wait">
             {step === 1 && (
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
                       <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-[32px] bg-surface-raised/30 group hover:border-accent/50 transition-all cursor-pointer relative overflow-hidden"
                            onClick={() => fileInputRef.current?.click()}>
                          {payload.thumbnailUrl ? (
                            <img src={payload.thumbnailUrl} alt="Capa" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                          ) : null}
                          
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                          
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
                           onChange={e => setPayload({...payload, titulo: e.target.value})}
                           placeholder="Ex: Engenharia de Prompt para Decisores"
                           className="text-2xl font-bold h-16 bg-surface-raised/50 border-border"
                         />
                       </div>
                       <div>
                         <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3 block">Descrição Provocativa</label>
                         <textarea 
                           className="w-full bg-surface-raised/50 border border-border rounded-2xl p-4 text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none min-h-[160px] transition-all"
                           placeholder="O que o aluno será capaz de fazer após este curso?"
                           value={payload.descricao}
                           onChange={e => setPayload({...payload, descricao: e.target.value})}
                         />
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3 block">Área Vocacional</label>
                            <select 
                              className="w-full bg-surface-raised/50 border border-border rounded-xl p-4 text-text-primary"
                              value={payload.area}
                              onChange={e => setPayload({...payload, area: e.target.value as AreaVocacional})}
                            >
                              <option value="TECNOLOGIA">Tecnologia</option>
                              <option value="ENGENHARIA">Engenharia</option>
                              <option value="GESTAO">Gestão</option>
                              <option value="ARTES">Artes</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3 block">Nível de Rigor</label>
                            <select 
                              className="w-full bg-surface-raised/50 border border-border rounded-xl p-4 text-text-primary"
                              value={payload.nivel}
                              onChange={e => setPayload({...payload, nivel: e.target.value as any})}
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
             )}

             {step === 2 && (
               <motion.div 
                 key="step2"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="space-y-6"
               >
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-black text-text-primary tracking-tight uppercase text-[12px] tracking-[0.2em]">Estrutura de Módulos</h3>
                    <Button onClick={() => setModulos([...modulos, { titulo: '', itens: [] }])} variant="secondary" className="rounded-full">
                       <Plus size={16} className="mr-2" /> Adicionar Módulo
                    </Button>
                 </div>
                 
                 {modulos.length === 0 ? (
                   <Card className="p-12 flex flex-col items-center justify-center text-center bg-surface-raised/50 border-dashed border-2 border-border rounded-[40px]">
                      <FileText size={48} className="text-text-muted opacity-20 mb-4" />
                      <p className="text-text-secondary font-medium">A tua trilha está vazia. Começa a adicionar módulos de aprendizagem.</p>
                   </Card>
                 ) : modulos.map((m, i) => (
                   <Card key={i} className="p-6 bg-surface border-border rounded-3xl space-y-4">
                      <div className="flex gap-4">
                        <div className="h-10 w-10 rounded-xl bg-accent text-white flex items-center justify-center font-black">
                          {i + 1}
                        </div>
                        <Input 
                          placeholder="Título do Módulo" 
                          value={m.titulo} 
                          className="flex-1"
                          onChange={e => {
                            const newM = [...modulos];
                            newM[i].titulo = e.target.value;
                            setModulos(newM);
                          }}
                        />
                        <Button variant="ghost" onClick={() => setModulos(modulos.filter((_, idx) => idx !== i))}>
                          <Trash2 size={18} className="text-error" />
                        </Button>
                      </div>

                      {/* Itens do Módulo */}
                      <div className="pl-14 space-y-3">
                         {m.itens.map((item: any, itemIdx: number) => (
                           <div key={itemIdx} className="flex gap-3 items-center bg-surface-raised/30 p-3 rounded-xl border border-border">
                              <FileText size={14} className="text-text-muted" />
                              <Input 
                                placeholder="Título da Lição" 
                                value={item.titulo} 
                                className="h-8 text-xs bg-transparent border-none focus:ring-0"
                                onChange={e => {
                                  const newM = [...modulos];
                                  newM[i].itens[itemIdx].titulo = e.target.value;
                                  setModulos(newM);
                                }}
                              />
                              <select 
                                className="bg-transparent text-[10px] font-bold uppercase text-text-muted outline-none"
                                value={item.tipo}
                                onChange={e => {
                                  const newM = [...modulos];
                                  newM[i].itens[itemIdx].tipo = e.target.value;
                                  setModulos(newM);
                                }}
                              >
                                <option value="video">Vídeo</option>
                                <option value="pdf">PDF</option>
                                <option value="texto">Texto</option>
                              </select>
                           </div>
                         ))}
                         <button 
                           onClick={() => {
                             const newM = [...modulos];
                             newM[i].itens.push({ titulo: '', tipo: 'video', conteudo: '' });
                             setModulos(newM);
                           }}
                           className="flex items-center gap-2 text-[10px] font-black uppercase text-accent hover:text-accent-hover transition-colors mt-2"
                         >
                            <Plus size={12} /> Adicionar Lição
                         </button>
                      </div>
                   </Card>
                 ))}
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        {/* Sidebar: Match Rules & Decision */}
        <div className="lg:col-span-4 space-y-8">
           <Card className="p-8 bg-surface-alt border-border rounded-[40px] shadow-xl">
              <h3 className="text-[11px] font-black text-text-muted uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                <ShieldCheck size={14} className="text-accent" /> Regras de Mérito (Match)
              </h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase text-text-secondary mb-3">
                    <span>Fluidez Mínima (\u03D5)</span>
                    <span className="text-accent">{payload.regrasAcesso?.minFluidez}</span>
                  </div>
                  <input 
                    type="range" min="0" max="10" step="0.5" 
                    className="w-full accent-accent" 
                    value={payload.regrasAcesso?.minFluidez}
                    onChange={e => setPayload({...payload, regrasAcesso: {...payload.regrasAcesso, minFluidez: Number(e.target.value)}})}
                  />
                  <p className="text-[9px] text-text-muted mt-2">Só alunos com este nível de ritmo biomecânico verão o curso.</p>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase text-text-secondary mb-3">
                    <span>Resiliência Mínima (R)</span>
                    <span className="text-emerald-500">{payload.regrasAcesso?.minResiliencia}</span>
                  </div>
                  <input 
                    type="range" min="0" max="10" step="0.5" 
                    className="w-full accent-emerald-500" 
                    value={payload.regrasAcesso?.minResiliencia}
                    onChange={e => setPayload({...payload, regrasAcesso: {...payload.regrasAcesso, minResiliencia: Number(e.target.value)}})}
                  />
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-border">
                 <Button 
                   onClick={() => step < 3 ? setStep(step + 1) : handleSave()} 
                   className="w-full h-16 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-xs hover:scale-[1.02] shadow-xl shadow-accent/20"
                   disabled={loading}
                 >
                   {loading ? <Spinner /> : step < 3 ? <>Próximo Passo <ChevronRight size={16} className="ml-2" /></> : <>Publicar Curso <Save size={16} className="ml-2" /></>}
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
      </div>
    </div>
  );
};
