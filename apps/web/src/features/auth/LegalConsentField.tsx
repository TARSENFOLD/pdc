import { Link } from 'react-router-dom';

interface LegalConsentFieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  error?: string;
}

export function LegalConsentField({ checked, onCheckedChange, error }: LegalConsentFieldProps) {
  return (
    <div className="space-y-2 rounded-lg border border-ink-tertiary/10 bg-surface/60 p-3">
      <label className="flex items-start gap-3 text-xs leading-relaxed text-ink-secondary">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => { onCheckedChange(event.target.checked); }}
          className="mt-0.5 h-4 w-4 rounded border-ink-tertiary/20 text-accent focus:ring-accent"
        />
        <span>
          Li e aceito os <Link to="/termos" className="font-semibold text-accent hover:underline">Termos</Link>,
          a <Link to="/privacidade" className="font-semibold text-accent hover:underline"> Política de Privacidade</Link> e o tratamento dos meus dados para operar a conta PDC.
        </span>
      </label>
      {error ? <p className="text-xs font-medium text-error">{error}</p> : null}
    </div>
  );
}
