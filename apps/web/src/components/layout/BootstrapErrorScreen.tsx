import { ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';

interface BootstrapErrorScreenProps {
  error?: Error | null;
  onRetry: () => void;
}

export default function BootstrapErrorScreen({ error, onRetry }: BootstrapErrorScreenProps): React.ReactElement {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="h-20 w-20 bg-error/10 text-error rounded-3xl flex items-center justify-center mx-auto">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-2xl font-bold">Falha na Inicialização</h1>
        <p className="text-ink-secondary">{error?.message || 'Não foi possível ligar aos servidores soberanos.'}</p>
        <Button onClick={onRetry} className="w-full h-14 rounded-2xl bg-accent text-white font-bold">
          Tentar Re-autenticação
        </Button>
      </div>
    </div>
  );
}
