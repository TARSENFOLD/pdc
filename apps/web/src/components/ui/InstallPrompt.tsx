import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from './Button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => { window.removeEventListener('beforeinstallprompt', handler); };
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } catch (err) {
      console.error('Failed to prompt for installation:', err);
    } finally {
      setDismissed(true);
    }
  };

  return (
    <div
      data-testid="install-prompt"
      className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between gap-4 rounded-2xl border border-accent/20 bg-elevated p-4 shadow-2xl sm:left-auto sm:right-4 sm:max-w-sm"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
          <Download size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-ink-primary">Instalar PDC</p>
          <p className="text-xs text-ink-tertiary">Acesso mais rápido à plataforma</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => { void handleInstall(); }}>
          Instalar
        </Button>
        <button
          onClick={() => { setDismissed(true); }}
          className="text-ink-tertiary hover:text-ink-primary transition-colors p-3 -m-3"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
