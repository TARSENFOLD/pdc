import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

// Supported locales — adding here is enough to enable a new language
export const SUPPORTED_LOCALES = ['pt-PT', 'pt-BR', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'pt-PT';
export const NAMESPACES = ['common', 'glossary', 'dashboard', 'landing'] as const;
export type Namespace = (typeof NAMESPACES)[number];

const STORAGE_KEY = 'pdc:locale';

function detectLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
      return stored as SupportedLocale;
    }
  } catch { /* SSR / locked storage */ }
  const browser = typeof navigator !== 'undefined' ? navigator.language : '';
  if (browser.startsWith('pt-BR')) return 'pt-BR';
  if (browser.startsWith('pt')) return 'pt-PT';
  if (browser.startsWith('en')) return 'en';
  return DEFAULT_LOCALE;
}

void i18n
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`../../locales/${language}/${namespace}.json`) as Promise<Record<string, unknown>>,
    ),
  )
  .use(initReactI18next)
  .init({
    lng: detectLocale(),
    fallbackLng: DEFAULT_LOCALE,
    ns: NAMESPACES,
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    react: { useSuspense: true },
  });

export { i18n };
export default i18n;

export function setLocale(locale: SupportedLocale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch { /* ignore */ }
  void i18n.changeLanguage(locale);
}
