import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';

type AuthRole = 'estudante' | 'mentor' | 'instituicao';

interface AuthSplitLayoutProps {
  role: AuthRole;
  children: ReactNode;
}

const COPY: Record<AuthRole, { headline: string; bullets: string[] }> = {
  estudante: {
    headline: 'O teu futuro começa com evidência',
    bullets: [
      'Simulações práticas antes de te matriculares',
      'Perfil vocacional baseado no teu comportamento real',
      'Mentorias com profissionais da tua área de interesse',
    ],
  },
  mentor: {
    headline: 'Inspira a próxima geração',
    bullets: [
      'Partilha experiência com estudantes angolanos',
      'Cria cursos e simulações',
      'Acompanha o progresso dos teus mentorados',
    ],
  },
  instituicao: {
    headline: 'Conecta-te com quem importa',
    bullets: [
      'Publica experiências e programas gratuitos',
      'Conecta-te com estudantes qualificados',
      'Relatórios de engagement em tempo real',
    ],
  },
};

/* Enhanced pencil SVG — more detailed and premium */
function PencilIllustration() {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-40 w-40 drop-shadow-2xl"
      aria-hidden={true}
    >
      {/* Pencil Body with Gradient effect using opacities */}
      <rect x="70" y="20" width="20" height="90" rx="2" fill="currentColor" opacity="0.1" />
      <rect x="74" y="20" width="12" height="90" fill="currentColor" opacity="0.2" />
      <rect x="70" y="20" width="20" height="90" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      
      {/* Wood Part before Tip */}
      <polygon points="70,110 90,110 80,135" fill="currentColor" opacity="0.15" />
      <polygon points="70,110 90,110 80,135" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      
      {/* Graphite Tip */}
      <polygon points="76,125 84,125 80,135" fill="currentColor" opacity="0.6" />
      
      {/* Golden Ferrule (Metal band) */}
      <rect x="70" y="25" width="20" height="8" fill="currentColor" opacity="0.4" />
      <line x1="70" y1="29" x2="90" y2="29" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
      <line x1="70" y1="31" x2="90" y2="31" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
      
      {/* Eraser */}
      <path d="M70 20C70 14.4772 74.4772 10 80 10C85.5228 10 90 14.4772 90 20H70Z" fill="currentColor" opacity="0.2" />
      <path d="M70 20C70 14.4772 74.4772 10 80 10C85.5228 10 90 14.4772 90 20" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />

      {/* Dynamic Swoosh / Writing Line */}
      <path 
        d="M40 140C60 135 70 138 80 135C90 132 110 130 130 135" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        opacity="0.2" 
      />
      <path 
        d="M50 145C65 142 75 143 85 142" 
        stroke="currentColor" 
        strokeWidth="1" 
        strokeLinecap="round" 
        opacity="0.1" 
      />
    </svg>
  );
}

export function AuthSplitLayout({ role, children }: AuthSplitLayoutProps) {
  const { headline, bullets } = COPY[role];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden w-1/2 flex-col items-center justify-center bg-surface px-12 text-center lg:flex">
        <Link to="/" className="mb-10 text-2xl font-bold tracking-tight text-amber">
          PDC
        </Link>

        <div className="text-amber">
          <PencilIllustration />
        </div>

        <h2 className="mt-8 max-w-sm text-2xl font-bold leading-snug text-text-primary">
          {headline}
        </h2>

        <ul className="mt-6 space-y-3 text-left">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-text-secondary">
              <CheckCircle size={16} aria-hidden={true} className="mt-0.5 shrink-0 text-amber" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-col lg:w-1/2">
        {/* Back link — visible on both mobile (top) and desktop (top-left of form area) */}
        <div className="p-4 lg:p-8">
          <Link to="/criar-conta" className="inline-flex items-center gap-2 text-sm font-medium text-amber hover:text-amber-hover transition-colors">
            <ArrowLeft size={18} aria-hidden={true} />
            Voltar
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-12 lg:pt-0">
          {children}
        </div>
      </div>
    </div>
  );
}
