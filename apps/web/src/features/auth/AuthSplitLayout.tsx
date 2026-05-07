import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type React from 'react';
import { AuthLeftPanel } from '@/components/auth/AuthLeftPanel';
import { NeuralConstellation, type NeuralState } from '@/components/auth/NeuralConstellation';

type AuthRole = 'estudante' | 'mentor' | 'instituicao';

interface AuthSplitLayoutProps {
  role: AuthRole;
  children: ReactNode;
  neuralState?: NeuralState;
  onWarpComplete?: () => void;
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

export default function AuthSplitLayout({ role, children, neuralState = 'idle', onWarpComplete }: AuthSplitLayoutProps): React.JSX.Element {
  const { headline, subline } = HEADLINES[role];

  return (
    <div className="relative min-h-screen bg-canvas">
      {/* Mobile: neural banner no topo */}
      <div className="relative lg:hidden h-48 bg-black overflow-hidden">
        <NeuralConstellation state={neuralState} onWarpComplete={onWarpComplete} />
        <div className="absolute top-4 left-4 z-10">
          <Link to="/" className="block hover:opacity-80 transition-opacity">
            <img src="/logo_pdc.png" alt="PDC" className="h-7 w-auto brightness-0 invert opacity-60 hover:opacity-100 transition-opacity" />
          </Link>
        </div>
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <p className="text-sm font-bold text-white/80 leading-tight">{headline}</p>
          {subline && <p className="text-xs text-teal-400/60 mt-0.5">{subline}</p>}
        </div>
      </div>

      {/* Desktop: fixed neural panel esquerdo */}
      <div className="hidden lg:block">
        <AuthLeftPanel headline={headline} subline={subline} neuralState={neuralState} {...(onWarpComplete ? { onWarpComplete } : {})} />
      </div>

      {/* Formulário */}
      <div className="flex flex-col min-h-screen lg:min-h-0 lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          {children}
        </div>
      </div>
    </div>
  );
}
