/**
 * Back-compat wrapper over react-i18next's useTranslation.
 * Existing callers using t(key, fallback) continue to work unchanged.
 * New code should import useTranslation from 'react-i18next' directly.
 */
import { useTranslation as useI18nTranslation } from 'react-i18next';
import type { Namespace } from '@/lib/i18n/index.js';

interface UseTranslationReturn {
  t: (key: string, fallback?: string) => string;
  locale: string;
}

export function useTranslation(ns: Namespace = 'common'): UseTranslationReturn {
  const { t: i18nT, i18n } = useI18nTranslation(ns);

  function t(key: string, fallback?: string): string {
    const result = i18nT(key, { defaultValue: fallback ?? key });
    return typeof result === 'string' ? result : (fallback ?? key);
  }

  return { t, locale: i18n.language };
}
