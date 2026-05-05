import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui';
import { http } from '@/lib/api/http';
import { Users, UserPlus } from 'lucide-react';
import type { VinculoComPerfil } from '@pdc/shared';

interface VinculoPerfil {
  id: string | number;
  nome: string;
  userId?: string;
}

interface VinculoComPerfilUser extends Omit<VinculoComPerfil, 'solicitante' | 'destinatario'> {
  solicitante: VinculoPerfil;
  destinatario: VinculoPerfil;
}

function initials(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'P';
}

export function FeedActivitySidebar(): React.JSX.Element {
  const { data, isLoading, error } = useQuery({
    queryKey: ['vinculos', 'feed-sidebar'],
    queryFn: () => http.get<{ data: VinculoComPerfilUser[] }>('/vinculos'),
    staleTime: 60_000,
  });

  const vinculos = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6 sticky top-6">
        <Card className="p-8 bg-elevated border border-[var(--card-border)] shadow-lg rounded-2xl flex justify-center">
          <Spinner size="md" />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 sticky top-6">
        <Card className="p-5 bg-elevated border border-[var(--card-border)] shadow-lg rounded-2xl">
          <p className="text-sm text-ink-tertiary text-center">Erro ao carregar vínculos</p>
        </Card>
      </div>
    );
  }

  if (vinculos.length === 0) {
    return (
      <div className="space-y-6 sticky top-6">
        <Card className="p-5 bg-elevated border border-[var(--card-border)] shadow-lg rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-accent" />
            <h3 className="text-sm font-bold text-ink-primary uppercase tracking-wider">
              actividade dos seus vínculos
            </h3>
          </div>
          <div className="text-center py-8">
            <UserPlus size={32} className="mx-auto text-ink-tertiary mb-3" />
            <p className="text-sm text-ink-secondary">
              Ainda não tens vínculos.
            </p>
            <p className="text-xs text-ink-tertiary mt-1">
              Conecta com outros membros da comunidade.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 sticky top-6">
      {/* Vínculos Card */}
      <Card className="p-5 bg-elevated border border-[var(--card-border)] shadow-lg rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
          <h3 className="text-sm font-bold text-ink-primary uppercase tracking-wider">
            actividade dos seus vínculos
          </h3>
        </div>

        <div className="space-y-3">
          {vinculos.slice(0, 5).map((vinculo) => {
            const outro = vinculo.destinatario;
            return (
              <div key={vinculo.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-ink-primary/5 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-terracotta-deep flex items-center justify-center text-ink-on-accent text-sm font-bold">
                  {initials(outro.nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-primary truncate">{outro.nome}</p>
                  <p className="text-xs text-ink-tertiary">vínculo aprovado</p>
                </div>
              </div>
            );
          })}
        </div>

        {vinculos.length > 5 && (
          <button className="w-full mt-4 py-2 text-xs font-semibold text-ink-tertiary hover:text-ink-primary uppercase tracking-wider transition-colors">
            Ver mais →
          </button>
        )}
      </Card>

      {/* Pessoas que talvez conheças */}
      <Card className="p-5 bg-elevated border border-[var(--card-border)] shadow-lg rounded-2xl">
        <h3 className="text-sm font-bold text-ink-primary uppercase tracking-wider mb-4">
          Pessoas que talvez conheças
        </h3>
        <div className="space-y-3">
          {['Mentor TI', 'Instituto Superior', 'Empresa Parceira'].map((name, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-terracotta-deep flex items-center justify-center text-ink-on-accent text-sm font-bold">
                {name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink-primary">{name}</p>
                <p className="text-xs text-ink-tertiary">Área relacionada</p>
              </div>
              <button className="text-xs font-semibold text-accent hover:text-accent-soft">
                vincular
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
