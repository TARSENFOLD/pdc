import { useMutation } from '@tanstack/react-query';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui';
import { authApi } from '@/lib/api/auth';
import { toast } from '@/hooks/useToast';
import type { JSX } from 'react';

export function SecuritySettingsSection(): JSX.Element {
  const forgetDevice = useMutation({
    mutationFn: () => authApi.forgetTrustedDevice(),
    onSuccess: () => {
      toast({ title: 'Este browser deixou de ser confiável.' });
    },
    onError: () => {
      toast({ title: 'Não foi possível esquecer este browser', variant: 'error' });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-ink-primary">Segurança da conta</h3>
        <p className="mt-1 text-sm text-ink-secondary">
          Browsers novos precisam de um código de verificação depois da palavra-passe.
        </p>
      </div>

      <div className="border-t border-white/5 pt-6">
        <h4 className="font-bold text-ink-primary">Browser confiável</h4>
        <p className="mt-2 text-sm text-ink-secondary">
          Ao esquecer este browser, o próximo login volta a exigir um código de verificação.
        </p>
        <Button
          className="mt-5"
          variant="secondary"
          size="sm"
          disabled={forgetDevice.isPending}
          onClick={() => { forgetDevice.mutate(); }}
        >
          <ShieldOff size={16} />
          {forgetDevice.isPending ? 'A esquecer...' : 'Esquecer este browser'}
        </Button>
      </div>
    </div>
  );
}
