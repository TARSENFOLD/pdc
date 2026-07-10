import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/http';
import { Button, Input, PasswordInput } from '@/components/ui';
import AuthSplitLayout from './AuthSplitLayout';
import { AuthDivider, OAuthButtons } from './OAuthButtons';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import type { NeuralState } from '@/components/auth/NeuralConstellation';
import type { RegistoInstituicaoPayload } from '@pdc/shared';
import { LegalConsentField } from './LegalConsentField';
import { buildAceiteLegal } from './registrationCompliance';

const TIPOS = [
  { value: 'universidade', label: 'Universidade' },
  { value: 'instituto', label: 'Instituto' },
  { value: 'escola', label: 'Escola' },
  { value: 'centro_formacao', label: 'Centro de Formação' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'ong', label: 'ONG' },
  { value: 'laboratorio', label: 'Laboratório' },
  { value: 'outro', label: 'Outro' }
] as const;

function isValidTipo(value: string): value is RegistoInstituicaoPayload['tipo'] {
  return (TIPOS as readonly { value: string; label: string }[]).some((t) => t.value === value);
}

const REGIOES = [
  'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango', 'Cuanza Norte',
  'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla', 'Luanda', 'Lunda Norte',
  'Lunda Sul', 'Malanje', 'Moxico', 'Namibe', 'Uíge', 'Zaire',
] as const;
type Regiao = typeof REGIOES[number];
function isValidRegiao(value: string): value is Regiao {
  return (REGIOES as readonly string[]).includes(value);
}

export function RegistoInstituicaoPage() {
  const [form, setForm] = useState({
    nome: '', 
    email: '', 
    password: '', 
    regiao: '', 
    tipo: 'universidade' as RegistoInstituicaoPayload['tipo'], 
    nif: '',
    aceiteLegal: buildAceiteLegal(),
  });
  const [error, setError] = useState('');
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [legalError, setLegalError] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [neuralState, setNeuralState] = useState<NeuralState>('idle');
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload: RegistoInstituicaoPayload) => authApi.registarInstituicao(payload),
    onSuccess: () => { setSuccess(true); },
    onError: (err: unknown) => {
      let message = 'Erro ao criar conta.';
      if (err instanceof ApiError) {
        const body = err.body as { error?: string } | null;
        if (body?.error) message = body.error;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    },
  });

  function handleChange<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLegalError('');
    if (form.password !== confirmPassword) {
      setPasswordError('As palavras-passe não coincidem.');
      return;
    }
    if (!legalAccepted) {
      setLegalError('A aceitação dos documentos legais é obrigatória para criar conta.');
      return;
    }
    setPasswordError('');
    mutation.mutate({
      ...form,
      aceiteLegal: buildAceiteLegal(),
      nomeInstituicao: form.nome,
    });
  }

  if (success) {
    return (
      <AuthSplitLayout role="instituicao">
        <div className="max-w-md rounded-2xl border border-ink-tertiary/10 bg-elevated p-8 text-center shadow-xl">
          <CheckCircle size={48} aria-hidden={true} className="text-emerald-500 mx-auto" />
          <h1 className="mt-6 text-2xl font-bold text-ink-primary">Registo submetido</h1>
          <p className="mt-3 text-ink-secondary">
            A vossa conta institucional será validada rigorosamente pela nossa equipa de conformidade. Receberão um email quando o acesso for libertado.
          </p>
          <Link to="/login" className="mt-8 inline-block rounded-xl bg-emerald-500 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.03] hover:bg-emerald-600">
            Ir para login →
          </Link>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout role="instituicao" neuralState={neuralState}>
      <div className="w-full max-w-md rounded-2xl border border-ink-tertiary/10 bg-elevated p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-ink-primary">Conta Institucional</h1>
        <p className="mt-1 text-sm text-ink-secondary">Publica experiências e atrai os melhores talentos para a tua instituição.</p>

        <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-400 leading-relaxed">
          <AlertTriangle size={14} aria-hidden={true} className="inline-block mr-1.5 align-text-bottom" /> 
          <strong>Importante:</strong> Instituições requerem verificação de NIF e documentos oficiais para publicação de conteúdos.
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error ? <div className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">{error}</div> : null}

          <Input label="Nome da instituição" required value={form.nome}
            onFocus={() => { setNeuralState('pulse'); }}
            onBlur={() => { setNeuralState('idle'); }}
            onChange={(e) => { handleChange('nome', e.target.value); }} />
          <Input label="NIF" required value={form.nif} placeholder="Ex: 5000123456"
            onFocus={() => { setNeuralState('align'); }}
            onBlur={() => { setNeuralState('idle'); }}
            onChange={(e) => { handleChange('nif', e.target.value); }} />
          <Input label="Email institucional" type="email" required value={form.email}
            onFocus={() => { setNeuralState('align'); }}
            onBlur={() => { setNeuralState('idle'); }}
            onChange={(e) => { handleChange('email', e.target.value); }} />
          <PasswordInput id="inst-password" label="Palavra-passe" required minLength={8} placeholder="Mínimo 8 caracteres" value={form.password}
            onFocus={() => { setNeuralState('encrypt'); }}
            onBlur={() => { setNeuralState('idle'); }}
            onChange={(e) => { handleChange('password', e.target.value); setPasswordError(''); }} />
          <PasswordInput id="inst-password-confirm" label="Confirmar palavra-passe" required minLength={8} placeholder="Repete a palavra-passe" value={confirmPassword}
            onFocus={() => { setNeuralState('focus'); }}
            onBlur={() => { setNeuralState('idle'); }}
            onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }} />
          {passwordError && <p className="text-xs text-error font-medium">{passwordError}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink-secondary">Tipo</label>
              <select required value={form.tipo}
                onFocus={() => { setNeuralState('flow'); }}
                onBlur={() => { setNeuralState('idle'); }}
                onChange={(e) => { if (isValidTipo(e.target.value)) handleChange('tipo', e.target.value); }}
                className="flex h-10 w-full rounded-md border border-ink-tertiary/10 bg-elevated px-3 py-2 text-sm text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink-secondary">Região</label>
              <select required value={form.regiao}
                onFocus={() => { setNeuralState('flow'); }}
                onBlur={() => { setNeuralState('idle'); }}
                onChange={(e) => { if (isValidRegiao(e.target.value)) handleChange('regiao', e.target.value); }}
                className="flex h-10 w-full rounded-md border border-ink-tertiary/10 bg-elevated px-3 py-2 text-sm text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                <option value="">Seleciona…</option>
                {REGIOES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <LegalConsentField checked={legalAccepted} onCheckedChange={setLegalAccepted} error={legalError} />

          <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600" isLoading={mutation.isPending}>Registar Instituição →</Button>
        </form>

        <div className="mt-6">
          <AuthDivider />
          <OAuthButtons />
        </div>

        <p className="mt-6 text-center text-sm text-ink-tertiary">
          Não é uma instituição?{' '}
          <Link to="/criar-conta/estudante" className="text-accent font-semibold hover:underline">Estudante</Link>
          {' '}|{' '}
          <Link to="/criar-conta/mentor" className="text-accent font-semibold hover:underline">Mentor</Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
