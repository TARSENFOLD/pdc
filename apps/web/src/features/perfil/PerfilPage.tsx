import type React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ShieldCheck, UserRound } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import PerfilShowcase from './PerfilShowcase';

const INTERNAL_ROLE_LABELS = {
  moderador: 'Moderador',
  comite_cientifico: 'Comité Científico',
  super_admin: 'Super Admin',
} as const;

function InternalAccountPage(): React.JSX.Element | null {
  const { user } = useAuth();

  if (!user || !(user.role in INTERNAL_ROLE_LABELS)) return null;

  const isAdmin = user.role === 'super_admin';
  const roleLabel = INTERNAL_ROLE_LABELS[user.role as keyof typeof INTERNAL_ROLE_LABELS];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <section className="overflow-hidden rounded-2xl border border-ink-tertiary/10 bg-elevated shadow-sm">
        <div className="h-28 bg-gradient-to-r from-[#12304A] via-[#1e4d80] to-[#0d2438]" />
        <div className="px-6 pb-8 md:px-10">
          <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end">
            <Avatar
              src={user.avatarUrl ?? undefined}
              fallback={user.nome.slice(0, 2).toUpperCase()}
              className="h-24 w-24 border-4 border-elevated"
            />
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="truncate text-2xl font-black text-ink-primary">{user.nome}</h1>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
                <ShieldCheck size={14} />
                {roleLabel}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-recessed/60 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-tertiary">Email da conta</p>
              <p className="mt-2 break-all text-sm font-semibold text-ink-primary">{user.email}</p>
            </div>
            <div className="rounded-xl bg-recessed/60 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-tertiary">Tipo de identidade</p>
              <p className="mt-2 text-sm font-semibold text-ink-primary">
                {isAdmin ? 'Conta operacional privada' : 'Perfil interno mínimo'}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-ink-tertiary/10 p-4">
            <UserRound className="mt-0.5 shrink-0 text-ink-tertiary" size={18} />
            <div>
              <p className="text-sm font-semibold text-ink-primary">
                {isAdmin ? 'Esta conta não possui perfil público.' : 'Identidade institucional'}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                {isAdmin
                  ? 'A conta Super Admin é reservada à operação e governação da plataforma.'
                  : `A informação pública deste perfil está limitada ao nome e à função de ${roleLabel}.`}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Link
              to={isAdmin ? '/app/dashboard/admin' : `/app/dashboard/${user.role === 'moderador' ? 'moderador' : 'comite'}`}
              className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Aceder ao painel
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function PerfilPage(): React.JSX.Element {
  const { user } = useAuth();

  if (user?.role === 'instituicao') {
    return <Navigate to="/app/instituicao/perfil/identidade" replace />;
  }

  if (user?.role === 'moderador' || user?.role === 'comite_cientifico' || user?.role === 'super_admin') {
    return <InternalAccountPage />;
  }

  return <PerfilShowcase />;
}
