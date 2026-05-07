import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const LANGUAGES = [
  { code: 'pt-PT', label: 'Português (AO/PT)', flag: '🇦🇴' },
  { code: 'pt-BR', label: 'Português (BR)', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
];

const LOCALE_KEY = 'pdc:locale';

/**
 * LangSwitcher - Componente para alternar o idioma do sistema.
 * Persiste a escolha no localStorage['pdc:locale'].
 */
export function LangSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (code: string) => {
    void i18n.changeLanguage(code);
    localStorage.setItem(LOCALE_KEY, code);
  };

  return (
    <div className="flex flex-col gap-1 rounded-xl bg-[var(--surface-recessed)] p-1 border border-[var(--glass-border-light)]">
      <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--ink-tertiary)]">
        <Languages size={12} />
        <span>Idioma</span>
      </div>
      <div className="flex flex-col gap-0.5">
        {LANGUAGES.map((lang) => (
          <Button
            key={lang.code}
            variant={i18n.language === lang.code ? 'secondary' : 'ghost'}
            size="sm"
            className="h-9 justify-start gap-3 rounded-lg px-3 text-xs hover:bg-[var(--surface-elevated)]"
            onClick={() => { changeLanguage(lang.code); }}
          >
            <span className="text-base leading-none">{lang.flag}</span>
            <span className={i18n.language === lang.code ? 'text-[var(--ink-primary)] font-semibold' : 'text-[var(--ink-secondary)]'}>
              {lang.label}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * Versão compacta (dropdown ou toggle circular) pode ser adicionada aqui se necessário.
 */
