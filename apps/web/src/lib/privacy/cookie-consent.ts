import { z } from 'zod';

export const COOKIE_CONSENT_STORAGE_KEY = 'pdc.cookie-consent.v1';

export const CookieConsentChoiceSchema = z.enum(['essential', 'marketing']);
export type CookieConsentChoice = z.infer<typeof CookieConsentChoiceSchema>;

export const CookieConsentStateSchema = z.object({
  choice: CookieConsentChoiceSchema,
  acceptedAt: z.string().datetime(),
});
export type CookieConsentState = z.infer<typeof CookieConsentStateSchema>;

export function readCookieConsent(storage: Storage = window.localStorage): CookieConsentState | null {
  const raw = storage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = CookieConsentStateSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function writeCookieConsent(choice: CookieConsentChoice, storage: Storage = window.localStorage): CookieConsentState {
  const state: CookieConsentState = {
    choice,
    acceptedAt: new Date().toISOString(),
  };
  storage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function allowsMarketingCookies(state: CookieConsentState | null): boolean {
  return state?.choice === 'marketing';
}
