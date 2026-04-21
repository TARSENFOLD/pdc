import { Link } from 'react-router-dom';

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div>
            <span className="text-lg font-bold text-amber">PDC</span>
            <p className="mt-1 text-xs text-text-muted">Por Dentro do Curso - Angola</p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-text-secondary">
            <Link to="/login" className="transition-colors hover:text-text-primary">Entrar</Link>
            <Link to="/criar-conta" className="transition-colors hover:text-text-primary">Registar</Link>
            <a href="#problema" className="transition-colors hover:text-text-primary">Problema</a>
            <a href="#como-funciona" className="transition-colors hover:text-text-primary">Como funciona</a>
          </div>
        </div>
        <p className="mt-8 text-xs text-text-muted">
          © {new Date().getFullYear()} Por Dentro do Curso. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
