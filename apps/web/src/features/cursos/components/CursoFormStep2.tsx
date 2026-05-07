import { Plus, Trash2, FileText } from 'lucide-react';
import { Card, Button, Input } from '@/components/ui';
import { motion } from 'motion/react';

interface ModuloItem {
  titulo: string;
  tipo: string;
  conteudo: string;
}

interface Modulo {
  titulo: string;
  itens: ModuloItem[];
}

interface Props {
  modulos: Modulo[];
  setModulos: (m: Modulo[]) => void;
}

export const CursoFormStep2 = ({ modulos, setModulos }: Props) => {
  return (
    <motion.div 
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[12px] font-black text-ink-primary uppercase tracking-[0.2em]">Estrutura de Módulos</h3>
        <Button onClick={() => { setModulos([...modulos, { titulo: '', itens: [] }]); }} variant="secondary" className="rounded-full">
          <Plus size={16} className="mr-2" /> Adicionar Módulo
        </Button>
      </div>
      
      {modulos.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center bg-elevated/50 border-dashed border-2 border-ink-tertiary/10 rounded-[40px]">
          <FileText size={48} className="text-ink-tertiary opacity-20 mb-4" />
          <p className="text-ink-secondary font-medium">A tua trilha está vazia. Começa a adicionar módulos de aprendizagem.</p>
        </Card>
      ) : modulos.map((m, i) => (
        <Card key={i} className="p-6 bg-elevated border-ink-tertiary/10 rounded-3xl space-y-4">
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
                const mod = newM[i];
                if (mod) {
                  mod.titulo = e.target.value;
                  setModulos(newM);
                }
              }}
            />
            <Button variant="ghost" onClick={() => { setModulos(modulos.filter((_, idx) => idx !== i)); }}>
              <Trash2 size={18} className="text-error" />
            </Button>
          </div>

          {/* Itens do Módulo */}
          <div className="pl-14 space-y-3">
            {modulos[i]?.itens.map((item, itemIdx) => (
              <div key={itemIdx} className="flex gap-3 items-center bg-elevated/30 p-3 rounded-xl border border-ink-tertiary/10">
                <FileText size={14} className="text-ink-tertiary" />
                <Input 
                  placeholder="Título da Lição" 
                  value={item.titulo} 
                  className="h-8 text-xs bg-transparent border-none focus:ring-0"
                  onChange={e => {
                    const newM = [...modulos];
                    const mod = newM[i];
                    if (mod && mod.itens[itemIdx]) {
                      mod.itens[itemIdx].titulo = e.target.value;
                      setModulos(newM);
                    }
                  }}
                />
                <select 
                  className="bg-transparent text-[10px] font-bold uppercase text-ink-tertiary outline-none"
                  value={item.tipo}
                  onChange={e => {
                    const newM = [...modulos];
                    const mod = newM[i];
                    if (mod && mod.itens[itemIdx]) {
                      mod.itens[itemIdx].tipo = e.target.value;
                      setModulos(newM);
                    }
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
                const mod = newM[i];
                if (mod) {
                  mod.itens.push({ titulo: '', tipo: 'video', conteudo: '' });
                  setModulos(newM);
                }
              }}
              className="flex items-center gap-2 text-[10px] font-black uppercase text-accent hover:text-accent-hover transition-colors mt-2"
            >
              <Plus size={12} /> Adicionar Lição
            </button>
          </div>
        </Card>
      ))}
    </motion.div>
  );
};
