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

/* Inline pencil SVG — no external dependencies */
function PencilIllustration() {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-28 w-28 opacity-80"
      aria-hidden={true}
    >
      {/* Pencil body */}
      <rect x="52" y="18" width="16" height="72" rx="2" fill="currentColor" opacity="0.15" />
      <rect x="52" y="18" width="16" height="72" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      {/* Pencil tip */}
      <polygon points="52,90 68,90 60,108" fill="currentColor" opacity="0.25" />
      <polygon points="52,90 68,90 60,108" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.4" />
      {/* Pencil top band */}
      <rect x="52" y="18" width="16" height="10" rx="2" fill="currentColor" opacity="0.3" />
      {/* Eraser */}
      <rect x="54" y="10" width="12" height="10" rx="3" fill="currentColor" opacity="0.2" />
      <rect x="54" y="10" width="12" height="10" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      {/* Writing lines */}
      <line x1="30" y1="100" x2="48" y2="82" stroke="currentColor" strokeWidth="1.5" opacity="0.15" strokeLinecap="round" />
      <line x1="26" y1="96" x2="40" y2="82" stroke="currentColor" strokeWidth="1.5" opacity="0.1" strokeLinecap="round" />
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
        {/* Back link — visible on mobile only from the top */}
        <div className="p-4 lg:hidden">
          <Link to="/criar-conta" className="inline-flex items-center gap-1 text-sm text-amber hover:underline">
            <ArrowLeft size={16} aria-hidden={true} />
            Voltar
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
