import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTranslation } from '@/hooks/useTranslation';

export function LandingNavbar() {
  const { t } = useTranslation('landing');
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-background/60 backdrop-blur-[15px]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <img src="/favicon.png" alt="PDC Logo" className="h-8 w-8 object-contain transition-transform group-hover:scale-105" />
          <span className="text-xl font-bold tracking-tighter text-accent transition-transform group-hover:scale-105">PDC</span>
          <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />
          <span className="hidden text-xs font-medium uppercase tracking-[0.2em] text-text-muted sm:block">{t('navbar.logo_tagline')}</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          <a href="#problema" className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
            {t('navbar.links.problema')}
          </a>
          <a href="#como-funciona" className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
            {t('navbar.links.como_funciona')}
          </a>
          <a href="#features" className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
            {t('navbar.links.funcionalidades')}
          </a>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/login"
            className="hidden text-sm font-medium text-text-secondary transition-colors hover:text-text-primary sm:block"
          >
            {t('navbar.cta_login')}
          </Link>
          <Link
            to="/criar-conta"
            className="hidden rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98] sm:block"
          >
            {t('navbar.cta_primary')}
          </Link>
          {/* Hamburger — mobile only */}
          <button
            type="button"
            className="flex items-center justify-center rounded-lg p-2 text-text-secondary transition-colors hover:text-text-primary md:hidden"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => { setOpen((v) => !v); }}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border/40 bg-background/95 px-4 py-6 md:hidden">
          <div className="flex flex-col gap-4">
            <a href="#problema" className="text-base font-medium text-text-secondary" onClick={() => { setOpen(false); }}>
              {t('navbar.links.problema')}
            </a>
            <a href="#como-funciona" className="text-base font-medium text-text-secondary" onClick={() => { setOpen(false); }}>
              {t('navbar.links.como_funciona')}
            </a>
            <a href="#features" className="text-base font-medium text-text-secondary" onClick={() => { setOpen(false); }}>
              {t('navbar.links.funcionalidades')}
            </a>
            <div className="mt-2 flex flex-col gap-3 border-t border-border/40 pt-4">
              <Link to="/login" className="text-base font-medium text-text-secondary" onClick={() => { setOpen(false); }}>
                {t('navbar.cta_login')}
              </Link>
              <Link
                to="/criar-conta"
                className="rounded-lg bg-accent px-5 py-3 text-center text-sm font-semibold text-white"
                onClick={() => { setOpen(false); }}
              >
                {t('navbar.cta_primary')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
