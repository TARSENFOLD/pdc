import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function LandingNavbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-amber">PDC</span>
          <span className="hidden text-sm text-text-muted sm:block">Por Dentro do Curso</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#problema" className="text-sm text-text-secondary transition-colors hover:text-text-primary">
            Problema
          </a>
          <a href="#como-funciona" className="text-sm text-text-secondary transition-colors hover:text-text-primary">
            Como funciona
          </a>
          <a href="#features" className="text-sm text-text-secondary transition-colors hover:text-text-primary">
            Funcionalidades
          </a>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle variant="icon" />
          <Link
            to="/login"
            className="text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            Entrar
          </Link>
          <Link
            to="/criar-conta"
            className="rounded-lg bg-amber px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-hover"
          >
            Começar grátis
          </Link>
        </div>
      </nav>
    </header>
  );
}
