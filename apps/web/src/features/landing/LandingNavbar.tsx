import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function LandingNavbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-background/60 backdrop-blur-[15px]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-xl font-bold tracking-tighter text-accent transition-transform group-hover:scale-105">PDC</span>
          <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />
          <span className="hidden text-xs font-medium uppercase tracking-[0.2em] text-text-muted sm:block">Por Dentro do Curso</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#problema" className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
            Problema
          </a>
          <a href="#como-funciona" className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
            Como funciona
          </a>
          <a href="#features" className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
            Funcionalidades
          </a>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            to="/login"
            className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            Entrar
          </Link>
          <Link
            to="/criar-conta"
            className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98]"
          >
            Começar grátis
          </Link>
        </div>
      </nav>
    </header>
  );
}
