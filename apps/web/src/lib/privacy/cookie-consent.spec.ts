import { describe, expect, it } from 'vitest';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  allowsMarketingCookies,
  readCookieConsent,
  writeCookieConsent,
} from './cookie-consent';

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => { store.clear(); },
    getItem: (key) => store.get(key) ?? null,
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => { store.delete(key); },
    setItem: (key, value) => { store.set(key, value); },
  };
}

describe('cookie consent', () => {
  it('persiste preferência essencial sem ativar marketing', () => {
    const storage = memoryStorage();
    const state = writeCookieConsent('essential', storage);

    expect(readCookieConsent(storage)).toEqual(state);
    expect(allowsMarketingCookies(state)).toBe(false);
  });

  it('ativa marketing apenas quando aceite explicitamente', () => {
    const storage = memoryStorage();
    const state = writeCookieConsent('marketing', storage);

    expect(readCookieConsent(storage)?.choice).toBe('marketing');
    expect(allowsMarketingCookies(state)).toBe(true);
  });

  it('ignora payload corrompido', () => {
    const storage = memoryStorage();
    storage.setItem(COOKIE_CONSENT_STORAGE_KEY, '{"choice":"invalid"}');

    expect(readCookieConsent(storage)).toBeNull();
  });
});
