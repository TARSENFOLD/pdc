import { Link } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';

export function LandingFooter() {
  const { t } = useTranslation('landing');

  return (
    <footer className="bg-background px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div>
            <img src="/logo_pdc.png" alt="PDC - Por Dentro do Curso" className="h-7 w-auto object-contain" />
            <p className="mt-2 text-xs text-text-muted">{t('footer.tagline')}</p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-text-secondary">
            <Link to="/login" className="transition-colors hover:text-text-primary">{t('footer.links.entrar')}</Link>
            <Link to="/criar-conta" className="transition-colors hover:text-text-primary">{t('footer.links.registar')}</Link>
            <a href="#problema" className="transition-colors hover:text-text-primary">{t('footer.links.problema')}</a>
            <a href="#como-funciona" className="transition-colors hover:text-text-primary">{t('footer.links.como_funciona')}</a>
          </div>
        </div>
        <p className="mt-8 text-xs text-text-muted">
          {t('footer.copyright').replace('{{year}}', String(new Date().getFullYear()))}
        </p>
      </div>
    </footer>
  );
}
