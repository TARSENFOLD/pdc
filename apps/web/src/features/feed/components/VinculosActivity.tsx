import { Card } from '@/components/ui';
import { useTranslation } from 'react-i18next';
import { Activity } from 'lucide-react';

export function VinculosActivity() {
  const { t } = useTranslation();

  return (
    <Card className="bg-[var(--chrome-surface)] border-[var(--chrome-border)] rounded-sm p-4">
      <h3 className="text-[11px] font-bold text-[var(--ink-tertiary)] uppercase tracking-[0.12em] font-serif mb-4">
        {t('feed.atividadeVinculos', 'Atividade da Rede')}
      </h3>
      
      <div className="text-center py-6 space-y-3">
        <div className="mx-auto w-10 h-10 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center text-[var(--ink-tertiary)] opacity-50 mb-2">
          <Activity size={18} />
        </div>
        <p className="text-xs text-[var(--ink-secondary)] leading-relaxed italic">
          {t('feed.atividadeBrevemente', 'A atividade da sua rede aparecerá aqui em breve.')}
        </p>
      </div>
    </Card>
  );
}
