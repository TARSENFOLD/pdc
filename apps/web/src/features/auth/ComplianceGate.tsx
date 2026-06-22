import { useState } from 'react';
import type { FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  LegalComplianceCompletionSchema,
  resolveEstadoMenoridade,
} from '@pdc/shared';
import { authApi } from '@/lib/api/auth';
import { LegalConsentField } from './LegalConsentField';
import { buildAceiteLegal, emptyConsentimentoEncarregado } from './registrationCompliance';

type Parentesco = 'mae' | 'pai' | 'tutor_legal' | 'outro';

const PARENTESCOS: { value: Parentesco; label: string }[] = [
  { value: 'tutor_legal', label: 'Tutor legal' },
  { value: 'mae', label: 'Mãe' },
  { value: 'pai', label: 'Pai' },
  { value: 'outro', label: 'Outro' },
];

function getErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('body' in error)) return 'Não foi possível regularizar a conta.';
  const body = error.body;
  if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') return body.error;
  return 'Não foi possível regularizar a conta.';
}

export function ComplianceGate() {
  const queryClient = useQueryClient();
  const [dataNascimento, setDataNascimento] = useState('');
  const [aceitouLegal, setAceitouLegal] = useState(false);
  const [consentimentoEncarregado, setConsentimentoEncarregado] = useState(emptyConsentimentoEncarregado);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const menor = resolveEstadoMenoridade(dataNascimento) === 'menor';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const parsed = LegalComplianceCompletionSchema.safeParse({
      dataNascimento,
      aceiteLegal: aceitouLegal ? buildAceiteLegal() : undefined,
      ...(menor ? { consentimentoEncarregado } : {}),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Confirma os dados obrigatórios antes de continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedUser = await authApi.completarComplianceLegal(parsed.data);
      queryClient.setQueryData(['auth', 'me'], updatedUser);
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-10 text-ink-primary">
      <section className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
            <ShieldCheck size={14} />
            Conformidade obrigatória
          </div>
          <h1 className="font-authority text-3xl font-black tracking-tight sm:text-4xl">
            Regularizar conta
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-secondary">
            Atualiza os dados legais obrigatórios para continuar a usar o PDC.
          </p>
        </div>

        {error ? (
          <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-500">
            {error}
          </div>
        ) : null}

        <form onSubmit={(event) => { void handleSubmit(event); }} className="space-y-5">
          <Field
            id="compliance-data-nascimento"
            label="Data de nascimento"
            type="date"
            value={dataNascimento}
            onChange={setDataNascimento}
            required
          />

          {menor ? (
            <div className="grid gap-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 md:grid-cols-3">
              <Field
                id="compliance-encarregado-nome"
                label="Nome do encarregado"
                value={consentimentoEncarregado.nome}
                onChange={(nome) => { setConsentimentoEncarregado((current) => ({ ...current, nome })); }}
                required
              />
              <Field
                id="compliance-encarregado-email"
                label="Email do encarregado"
                type="email"
                value={consentimentoEncarregado.email}
                onChange={(email) => { setConsentimentoEncarregado((current) => ({ ...current, email })); }}
                required
              />
              <label htmlFor="compliance-parentesco" className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-ink-tertiary">
                  Parentesco
                </span>
                <select
                  id="compliance-parentesco"
                  value={consentimentoEncarregado.parentesco}
                  onChange={(event) => {
                    const match = PARENTESCOS.find((item) => item.value === event.target.value);
                    if (match) setConsentimentoEncarregado((current) => ({ ...current, parentesco: match.value }));
                  }}
                  className="h-12 w-full rounded-lg border border-ink-tertiary/10 bg-recessed px-4 text-sm text-ink-primary outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  {PARENTESCOS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
            </div>
          ) : null}

          <LegalConsentField checked={aceitouLegal} onCheckedChange={setAceitouLegal} />

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-14 w-full rounded-lg bg-ink-primary px-6 text-xs font-black uppercase tracking-widest text-canvas transition hover:bg-accent hover:text-ink-on-accent disabled:opacity-50"
          >
            {isSubmitting ? 'A regularizar...' : 'Regularizar e continuar'}
          </button>
        </form>
      </section>
    </main>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: 'text' | 'date' | 'email';
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-ink-tertiary">{label}</span>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(event) => { onChange(event.target.value); }}
        className="h-12 w-full rounded-lg border border-ink-tertiary/10 bg-recessed px-4 text-sm text-ink-primary outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
      />
    </label>
  );
}
