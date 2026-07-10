import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { dismissWebPushPrompt, enableWebPush, getWebPushSupportStatus } from '@/lib/push/webPushClient';
import { useToast } from '@/hooks/useToast';

export function WebPushOptIn() {
  const [status, setStatus] = useState(getWebPushSupportStatus);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (status !== 'supported' || !('serviceWorker' in navigator)) return;
    let active = true;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((existing) => {
        if (active && existing) setSubscribed(true);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [status]);

  if (status !== 'supported' || subscribed) return null;

  async function handleEnable() {
    setLoading(true);
    try {
      await enableWebPush();
      setStatus(getWebPushSupportStatus());
      setSubscribed(true);
      toast({
        title: 'Notificações ativadas',
        description: 'Vais receber alertas importantes mesmo com a aba fechada.',
        variant: 'success',
      });
    } catch (err: unknown) {
      toast({
        title: 'Não foi possível ativar notificações',
        description: err instanceof Error ? err.message : 'Tenta novamente mais tarde.',
        variant: 'warning',
      });
      setStatus(getWebPushSupportStatus());
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    dismissWebPushPrompt();
    setStatus('dismissed');
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 flex items-center justify-between gap-4 rounded-2xl border border-accent/20 bg-elevated/95 p-4 shadow-2xl backdrop-blur sm:left-auto sm:right-4 sm:max-w-md">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Bell size={20} />
        </div>
        <div>
          <p className="text-sm font-black text-ink-primary">Ativar alertas inteligentes</p>
          <p className="text-xs leading-relaxed text-ink-tertiary">
            Recebe convites, conquistas e respostas importantes mesmo quando não tens o PDC aberto.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" onClick={() => { void handleEnable(); }} isLoading={loading}>
          Ativar
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          className="-m-3 p-3 text-ink-tertiary transition-colors hover:text-ink-primary"
          aria-label="Dispensar alerta de notificações"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}