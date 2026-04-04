import { FeedList } from './components/FeedList';
import { TrendingSidebar } from './components/TrendingSidebar';
import { Button } from '@/components/ui/Button';
import { Search, Filter } from 'lucide-react';

export default function FeedPage() {
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Para Ti</h1>
          <p className="text-text-secondary">Explora as melhores recomendações vocacionais para o teu perfil.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              className="bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber/50 w-full md:w-64"
            />
          </div>
          <Button variant="ghost" size="sm" className="gap-2">
            <Filter className="w-4 h-4" /> Filtros
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <main className="lg:col-span-2">
          <FeedList />
        </main>
        
        <aside className="hidden lg:block space-y-8">
          <TrendingSidebar />
          
          <div className="bg-amber/10 border border-amber/20 rounded-xl p-6">
            <h3 className="text-sm font-bold text-amber uppercase mb-2">Dica Vocacional</h3>
            <p className="text-xs text-text-primary leading-relaxed">
              Sabias que completar uma simulação aumenta em 40% a tua clareza sobre uma área? 
              Tenta concluir o desafio "Diagnóstico de Sistemas" hoje!
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
