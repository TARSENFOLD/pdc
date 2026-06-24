import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { authApi, type LoginResponse } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/http';
import { Button, Input, PasswordInput } from '@/components/ui';
import AuthSplitLayout from './AuthSplitLayout';
import { AuthDivider, OAuthButtons } from './OAuthButtons';
import { resolveEstadoMenoridade, type RegistoEstudantePayload, type AreaVocacional } from '@pdc/shared';
import type { NeuralState } from '@/components/auth/NeuralConstellation';
import { LegalConsentField } from './LegalConsentField';
import { buildAceiteLegal, emptyConsentimentoEncarregado } from './registrationCompliance';

const AREAS: Array<{ value: AreaVocacional; label: string }> = [
  { value: 'SAUDE', label: 'Saúde' },
  { value: 'ENGENHARIA', label: 'Engenharia' },
  { value: 'TECNOLOGIA', label: 'Tecnologia' },
  { value: 'DIREITO', label: 'Direito' },
  { value: 'GESTAO', label: 'Gestão' },
  { value: 'EDUCACAO', label: 'Educação' },
  { value: 'ARTES', label: 'Artes' },
  { value: 'CIENCIAS_AGRARIAS', label: 'Ciências Agrárias' },
  { value: 'CIENCIAS_SOCIAIS', label: 'Ciências Sociais' },
  { value: 'COMUNICACAO', label: 'Comunicação' },
  { value: 'CIENCIAS_NATURAIS', label: 'Ciências Naturais' },
  { value: 'ARQUITETURA', label: 'Arquitetura' },
  { value: 'TURISMO_HOTELARIA', label: 'Turismo e Hotelaria' },
  { value: 'DESPORTO', label: 'Desporto' },
  { value: 'OUTRA', label: 'Geral' },
];

const NIVEIS = ['Secundário', 'Licenciatura', 'Mestrado', 'Doutoramento'] as const;

function isAreaVocacionalValue(value: string): value is AreaVocacional {
  return AREAS.some((a) => a.value === value);
}

function resolveSuggestedArea(value: string | null): AreaVocacional | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  return isAreaVocacionalValue(normalized) ? normalized : null;
}

function getApiErrorMessage(err: ApiError): string | null {
  const result = z.object({ error: z.string() }).safeParse(err.body);
  return result.success ? result.data.error : null;
}

export function RegistoEstudantePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const suggestedArea = resolveSuggestedArea(searchParams.get('area'));

  const [form, setForm] = useState<RegistoEstudantePayload>({
    nome: '',
    email: '',
    password: '',
    areaInteresse: 'OUTRA',
    nivelEnsino: '',
    dataNascimento: '',
    aceiteLegal: buildAceiteLegal(),
  });

  const [error, setError] = useState('');
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [legalError, setLegalError] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [neuralState, setNeuralState] = useState<NeuralState>('idle');
  const isMinor = resolveEstadoMenoridade(form.dataNascimento) === 'menor';

  // Sincronizar área sugerida vinda do Micro Desafio
  useEffect(() => {
    if (suggestedArea && AREAS.some(a => a.value === suggestedArea)) {
      setForm(prev => ({ ...prev, areaInteresse: suggestedArea }));
    }
  }, [suggestedArea]);

  const mutation = useMutation({
    mutationFn: (payload: RegistoEstudantePayload) => authApi.registarEstudante(payload),
    onSuccess: (result: LoginResponse) => { 
      if ('requiresOtp' in result) {
        navigate('/verificar', { state: { canal: result.canal, from: '/app' }, replace: true }); 
      } else {
        navigate('/app', { replace: true });
      }
    },
    onError: (err: unknown) => {
      let message = 'Erro ao criar conta.';
      if (err instanceof ApiError) {
        message = getApiErrorMessage(err) ?? message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    },
  });

  function handleChange<K extends keyof RegistoEstudantePayload>(key: K, value: RegistoEstudantePayload[K]) {
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
    if (isMinor && !form.consentimentoEncarregado) {
      setError('Indica o encarregado de educação para concluir o registo.');
      return;
    }
    setPasswordError('');
    mutation.mutate({ ...form, aceiteLegal: buildAceiteLegal() });
  }

  return (
    <AuthSplitLayout role="estudante" neuralState={neuralState}>
      <div className="w-full max-w-md rounded-2xl bg-elevated p-8 shadow-sm" style={{ border: '1px solid var(--card-border)' }}>
        <h1 className="text-2xl font-bold text-ink-primary">Conta de Estudante</h1>
        <p className="mt-1 text-sm text-ink-secondary">Preenche os dados para desbloquear o teu <span className="text-accent font-bold">Perfil Vocacional Completo</span>.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error ? <div className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">{error}</div> : null}

          <Input id="registo-nome" label="Nome completo" required value={form.nome}
            onFocus={() => { setNeuralState('pulse'); }}
            onBlur={() => { setNeuralState('idle'); }}
            onChange={(e) => { handleChange('nome', e.target.value); }} />
          <Input id="registo-email" label="Email" type="email" required value={form.email}
            onFocus={() => { setNeuralState('align'); }}
            onBlur={() => { setNeuralState('idle'); }}
            onChange={(e) => { handleChange('email', e.target.value); }} />
          <PasswordInput id="registo-password" label="Palavra-passe" required minLength={8} placeholder="Mínimo 8 caracteres" value={form.password}
            onFocus={() => { setNeuralState('encrypt'); }}
            onBlur={() => { setNeuralState('idle'); }}
            onChange={(e) => { handleChange('password', e.target.value); setPasswordError(''); }} />
          <PasswordInput id="registo-password-confirm" label="Confirmar palavra-passe" required minLength={8} placeholder="Repete a palavra-passe" value={confirmPassword}
            onFocus={() => { setNeuralState('focus'); }}
            onBlur={() => { setNeuralState('idle'); }}
            onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }} />
          {passwordError && <p className="text-xs text-error font-medium">{passwordError}</p>}

          <Input id="registo-data-nascimento" label="Data de nascimento" type="date" required value={form.dataNascimento}
            onFocus={() => { setNeuralState('focus'); }}
            onBlur={() => { setNeuralState('idle'); }}
            onChange={(e) => {
              const dataNascimento = e.target.value;
              handleChange('dataNascimento', dataNascimento);
              if (resolveEstadoMenoridade(dataNascimento) !== 'menor') {
                handleChange('consentimentoEncarregado', undefined);
              } else if (!form.consentimentoEncarregado) {
                handleChange('consentimentoEncarregado', emptyConsentimentoEncarregado());
              }
            }} />

          {isMinor ? (
            <div className="space-y-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
              <p className="text-xs font-semibold text-accent">Consentimento do encarregado</p>
              <Input id="registo-encarregado-nome" label="Nome do encarregado" required value={form.consentimentoEncarregado?.nome ?? ''}
                onChange={(e) => {
                  handleChange('consentimentoEncarregado', {
                    ...emptyConsentimentoEncarregado(),
                    ...form.consentimentoEncarregado,
                    nome: e.target.value,
                  });
                }} />
              <Input id="registo-encarregado-email" label="Email do encarregado" type="email" required value={form.consentimentoEncarregado?.email ?? ''}
                onChange={(e) => {
                  handleChange('consentimentoEncarregado', {
                    ...emptyConsentimentoEncarregado(),
                    ...form.consentimentoEncarregado,
                    email: e.target.value,
                  });
                }} />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="registo-area-interesse" className="text-sm font-medium text-ink-secondary">Área de interesse</label>
            <select id="registo-area-interesse" required value={form.areaInteresse}
              onFocus={() => { setNeuralState('flow'); }}
              onBlur={() => { setNeuralState('idle'); }}
              onChange={(e) => { const val = e.target.value; if (isAreaVocacionalValue(val)) handleChange('areaInteresse', val); }}
              className="flex h-10 w-full rounded-md border border-ink-tertiary/10 bg-elevated px-3 py-2 text-sm text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="registo-nivel-ensino" className="text-sm font-medium text-ink-secondary">Nível de ensino</label>
            <select id="registo-nivel-ensino" required value={form.nivelEnsino}
              onFocus={() => { setNeuralState('flow'); }}
              onBlur={() => { setNeuralState('idle'); }}
              onChange={(e) => { handleChange('nivelEnsino', e.target.value); }}
              className="flex h-10 w-full rounded-md border border-ink-tertiary/10 bg-elevated px-3 py-2 text-sm text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <option value="">Seleciona…</option>
              {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <LegalConsentField checked={legalAccepted} onCheckedChange={setLegalAccepted} error={legalError} />

          <Button type="submit" className="w-full" isLoading={mutation.isPending}>Registar e Continuar →</Button>
        </form>

        <div className="mt-6">
          <AuthDivider />
          <OAuthButtons />
        </div>

        <p className="mt-6 text-center text-sm text-ink-tertiary">
          Não és estudante?{' '}
          <Link to="/criar-conta/mentor" className="text-accent font-semibold hover:underline">Mentor</Link>
          {' '}|{' '}
          <Link to="/criar-conta/instituicao" className="text-accent font-semibold hover:underline">Instituição</Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
