import { useEffect, useState } from 'react';
import { Cookie, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { readCookieConsent, writeCookieConsent, type CookieConsentChoice } from '@/lib/privacy/cookie-consent';

export function CookieBanner(): React.JSX.Element | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readCookieConsent() === null);
  }, []);

  function choose(choice: CookieConsentChoice): void {
    writeCookieConsent(choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-canvas/95 px-4 py-4 shadow-2xl backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <Cookie className="mt-1 shrink-0 text-accent" size={20} />
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-ink-primary">Preferências de cookies</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-ink-secondary">
              Usamos cookies essenciais para autenticação e segurança. Cookies de marketing só serão usados se forem aceites.
            </p>
            <a href="/cookies" className="text-xs font-bold uppercase tracking-widest text-accent hover:underline">
              Ver política de cookies
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="ghost" onClick={() => { choose('essential'); }}>
            <X size={16} />
            Só essenciais
          </Button>
          <Button type="button" onClick={() => { choose('marketing'); }}>
            Aceitar marketing
          </Button>
        </div>
      </div>
    </div>
  );
}
