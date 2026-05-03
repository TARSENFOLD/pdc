import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AuthLeftPanel } from '@/components/auth/AuthLeftPanel';

type AuthRole = 'estudante' | 'mentor' | 'instituicao';

interface AuthSplitLayoutProps {
  role: AuthRole;
  children: ReactNode;
}

const HEADLINES: Record<AuthRole, { headline: string; subline: string }> = {
  estudante: {
    headline: 'O teu futuro começa com evidência',
    subline: 'Simulações, mentorias e perfil vocacional.',
  },
  mentor: {
    headline: 'Inspira a próxima geração',
    subline: 'Partilha experiência com estudantes angolanos.',
  },
  instituicao: {
    headline: 'Conecta-te com quem importa',
    subline: 'Estudantes qualificados, relatórios em tempo real.',
  },
};

export function AuthSplitLayout({ role, children }: AuthSplitLayoutProps) {
  const { headline, subline } = HEADLINES[role];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen bg-canvas">
      {/* Left: sticky neural panel — hidden on mobile */}
      <div className="hidden lg:block">
        <AuthLeftPanel headline={headline} subline={subline} />
      </div>

      {/* Right: scrollable form */}
      <div className="flex flex-col min-h-screen">
        <div className="p-4 lg:p-8">
          <Link
            to="/criar-conta"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            <ArrowLeft size={16} aria-hidden />
            Voltar
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12">
          {children}
        </div>
      </div>
    </div>
  );
}
