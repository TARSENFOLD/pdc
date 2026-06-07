import { useAuth } from '@/lib/auth/auth-context';
import { Card, Avatar } from '@/components/ui';
import { useQuery } from '@tanstack/react-query';
import { vinculosApi } from '@/lib/api/vinculos';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { UserRound } from 'lucide-react';

export function ProfileSummaryCard() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: vinculosData } = useQuery({
    queryKey: ['vinculos', 'meus', 'total'],
    queryFn: () => vinculosApi.getMeus(),
    enabled: !!user,
  });

  // Se não houver utilizador, retornamos null em vez de placeholders,
  // dado que a página de feed deve estar protegida por auth.
  if (!user) return null;

  const totalVinculos = vinculosData?.meta?.pagination?.total ?? vinculosData?.data.length ?? 0;
  
  // Lógica RBAC para Métricas
  const showConquistas = ['estudante', 'mentor'].includes(user.role);
  const totalConquistas = user.conquistas.length;

  return (
    <Card className="overflow-hidden bg-[var(--chrome-surface)] border-[var(--chrome-border)] rounded-sm p-0">
      {/* Cover Image */}
      {user.bannerUrl ? (
        <img src={user.bannerUrl} alt="Cover" className="h-24 w-full object-cover border-b border-[var(--chrome-border)]" />
      ) : (
        <div className="h-24 w-full bg-[#1A1A1A] border-b border-[var(--chrome-border)]"></div>
      )}
      
      <div className="px-4 pb-4 flex flex-col items-center -mt-10 relative z-10">
        <Avatar 
          src={user.avatarUrl || undefined} 
          fallback={user.nome.substring(0, 2)} 
          className="h-20 w-20 border-4 border-[var(--chrome-surface)] bg-[#1A1A1A] text-white shadow-sm"
        />
        
        <h2 className="mt-2 text-base font-bold text-[var(--ink-primary)] text-center tracking-tight">
          {user.nome}
        </h2>
        
        <p className="text-xs text-[var(--ink-secondary)] text-center capitalize mb-3">
          {user.role.replace('_', ' ')}
        </p>

        <Link
          to="/app/perfil"
          className="mb-3 inline-flex min-h-10 w-full items-center justify-center gap-2 border border-[var(--chrome-border)] text-xs font-semibold text-[var(--ink-primary)] transition-colors hover:border-[var(--accent-terracotta)] hover:text-[var(--accent-terracotta)]"
        >
          <UserRound size={15} />
          Ver perfil
        </Link>

        <div className={`w-full grid ${showConquistas ? 'grid-cols-2' : 'grid-cols-1'} gap-4 border-t border-[var(--chrome-border)] pt-3 mt-1`}>
          <div className="text-center">
            <div className="text-[10px] text-[var(--ink-tertiary)] uppercase tracking-[0.15em] font-semibold">{t('feed.vinculos', 'Vínculos')}</div>
            <div className="text-sm font-bold text-[var(--ink-primary)] mt-0.5">{totalVinculos}</div>
          </div>
          {showConquistas && (
            <div className="text-center">
              <div className="text-[10px] text-[var(--ink-tertiary)] uppercase tracking-[0.15em] font-semibold">{t('feed.conquistas', 'Conquistas')}</div>
              <div className="text-sm font-bold text-[var(--ink-primary)] mt-0.5">{totalConquistas}</div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
