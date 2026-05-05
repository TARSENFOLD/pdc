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
        <Card className="p-8 bg-[#1E1E1E] border border-white/10 shadow-lg rounded-2xl flex justify-center">
          <Spinner size="md" />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 sticky top-6">
        <Card className="p-5 bg-[#1E1E1E] border border-white/10 shadow-lg rounded-2xl">
          <p className="text-sm text-gray-500 text-center">Erro ao carregar vínculos</p>
        </Card>
      </div>
    );
  }

  if (vinculos.length === 0) {
    return (
      <div className="space-y-6 sticky top-6">
        <Card className="p-5 bg-[#1E1E1E] border border-white/10 shadow-lg rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-[#B65F2A]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              actividade dos seus vínculos
            </h3>
          </div>
          <div className="text-center py-8">
            <UserPlus size={32} className="mx-auto text-gray-600 mb-3" />
            <p className="text-sm text-gray-500">
              Ainda não tens vínculos.
            </p>
            <p className="text-xs text-gray-600 mt-1">
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
      <Card className="p-5 bg-[#1E1E1E] border border-white/10 shadow-lg rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            actividade dos seus vínculos
          </h3>
        </div>

        <div className="space-y-3">
          {vinculos.slice(0, 5).map((vinculo) => {
            const outro = vinculo.destinatario;
            return (
              <div key={vinculo.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#B65F2A] to-[#8F451F] flex items-center justify-center text-white text-sm font-bold">
                  {initials(outro.nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{outro.nome}</p>
                  <p className="text-xs text-gray-500">vínculo aprovado</p>
                </div>
              </div>
            );
          })}
        </div>

        {vinculos.length > 5 && (
          <button className="w-full mt-4 py-2 text-xs font-semibold text-gray-500 hover:text-white uppercase tracking-wider transition-colors">
            Ver mais →
          </button>
        )}
      </Card>
    </div>
  );
}
