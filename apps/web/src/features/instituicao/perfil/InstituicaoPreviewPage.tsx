import { useOutletContext } from 'react-router-dom';
import { Building2, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui';
import type { InstituicaoEditor } from '@/lib/api/instituicoes';

export function InstituicaoPreviewPage() {
  const { instituicao: i } = useOutletContext<{ instituicao: InstituicaoEditor }>();
  return (
    <Card className="overflow-hidden">
      <div className="h-36 bg-institutional-cobalt/10" style={i.multimedia?.capaUrl ? { backgroundImage: `url(${i.multimedia.capaUrl})`, backgroundSize: 'cover' } : undefined} />
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          {i.multimedia?.logoUrl ? <img src={i.multimedia.logoUrl} alt={`Logotipo de ${i.identidade.nome}`} className="h-20 w-20 rounded-xl object-contain" /> : <Building2 size={48} />}
          <div>
            <h2 className="text-2xl font-black">{i.identidade.nome}</h2>
            <p className="text-sm text-ink-secondary">{i.identidade.tipo} · {i.localizacao?.provincia ?? 'Angola'}</p>
            {i.verificada ? <span className="mt-2 inline-flex items-center gap-1 text-xs text-accent"><ShieldCheck size={14} /> Verificada</span> : null}
          </div>
        </div>
        <p className="text-sm text-ink-secondary">{i.identidade.descricao ?? 'Adiciona uma descrição institucional.'}</p>
        <div>
          <h3 className="font-bold">Oferta</h3>
          <p className="mt-1 text-sm text-ink-secondary">
            {Array.isArray(i.oferta?.areasAtividade) && i.oferta.areasAtividade.length > 0
              ? i.oferta.areasAtividade.join(', ')
              : 'Ainda sem áreas publicadas.'}
          </p>
        </div>
      </div>
    </Card>
  );
}
