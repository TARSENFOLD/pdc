import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/http';
import { Button, Input, PasswordInput } from '@/components/ui';
import AuthSplitLayout from './AuthSplitLayout';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import type { NeuralState } from '@/components/auth/NeuralConstellation';
import type { RegistoMentorPayload, AreaVocacional } from '@pdc/shared';

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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function RegistoMentorPage() {
  const [form, setForm] = useState<RegistoMentorPayload>({
    nome: '', 
    email: '', 
    password: '', 
    areaEspecialidade: 'OUTRA',
    especialidade: '',
    areasAtuacao: ['OUTRA'],
  });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docError, setDocError] = useState('');
  const [error, setError] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [neuralState, setNeuralState] = useState<NeuralState>('idle');
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (payload: RegistoMentorPayload) => authApi.registarMentor(payload),
    onSuccess: () => { setSuccess(true); },
    onError: (err: unknown) => {
      let message = 'Erro ao criar conta.';
      if (err instanceof ApiError) {
        const body = err.body as Record<string, unknown> | undefined;
        if (typeof body?.error === 'string') message = body.error;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    },
  });

  function handleChange<K extends keyof RegistoMentorPayload>(key: K, value: RegistoMentorPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setDocError('');
    if (!file) { setDocFile(null); return; }
    if (file.type !== 'application/pdf') { setDocError('Apenas ficheiros PDF.'); setDocFile(null); return; }
    if (file.size > MAX_FILE_SIZE) { setDocError('Ficheiro excede 5 MB.'); setDocFile(null); return; }
    setDocFile(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== confirmPassword) {
      setPasswordError('As palavras-passe não coincidem.');
      return;
    }
    setPasswordError('');
    mutation.mutate({
      ...form,
      areasAtuacao: form.areaEspecialidade ? [form.areaEspecialidade] : form.areasAtuacao,
      especialidade: form.especialidade || 'Mentor Especialista',
      documentos: docFile ? [docFile.name] : [],
    });
  }

  if (success) {
    return (
      <AuthSplitLayout role="mentor">
        <div className="max-w-md rounded-2xl border border-ink-tertiary/10 bg-elevated p-8 text-center shadow-xl">
          <CheckCircle size={48} aria-hidden={true} className="text-emerald-500 mx-auto" />
          <h1 className="mt-6 text-2xl font-bold text-ink-primary">Conta criada com sucesso</h1>
          <p className="mt-3 text-ink-secondary">
            A tua conta de mentor será validada pela nossa equipa de elite. Receberás um email de confirmação quando estiver activa.
          </p>
          <Link to="/login" className="mt-8 inline-block rounded-xl bg-accent px-8 py-3 text-sm font-bold text-white shadow-lg shadow-accent/20 transition-all hover:scale-[1.03] hover:bg-accent-terracotta-soft">
            Ir para login →
          </Link>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout role="mentor" neuralState={neuralState}>
      <div className="w-full max-w-md rounded-2xl border border-ink-tertiary/10 bg-elevated p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-ink-primary">Conta de Mentor</h1>
        <p className="mt-1 text-sm text-ink-secondary">Partilha a tua experiência profissional com a nova geração.</p>

        <div className="mt-6 rounded-xl border border-accent/20 bg-accent/5 p-4 text-xs text-accent leading-relaxed">
          <AlertTriangle size={14} aria-hidden={true} className="inline-block mr-1.5 align-text-bottom" /> 
          <strong>Nota:</strong> Contas de mentor requerem validação documental. O processo de aprovação poderá demorar até 48h úteis.
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error ? <div className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">{error}</div> : null}

          <Input label="Nome completo" required value={form.nome}
            onFocus={() => { setNeuralState('pulse'); }}
            onBlur={() => { setNeuralState('idle'); }}
            onChange={(e) => { handleChange('nome', e.target.value); }} />
          <Input label="Email profissional" type="email" required value={form.email}
            onFocus={() => { setNeuralState('align'); }}
            onBlur={() => { setNeuralState('idle'); }}
            onChange={(e) => { handleChange('email', e.target.value); }} />
          <PasswordInput id="mentor-password" label="Palavra-passe" required minLength={8} placeholder="Mínimo 8 caracteres" value={form.password}
            onFocus={() => { setNeuralState('encrypt'); }}
            onBlur={() => { setNeuralState('idle'); }}
            onChange={(e) => { handleChange('password', e.target.value); setPasswordError(''); }} />
          <PasswordInput id="mentor-password-confirm" label="Confirmar palavra-passe" required minLength={8} placeholder="Repete a palavra-passe" value={confirmPassword}
            onFocus={() => { setNeuralState('focus'); }}
            onBlur={() => { setNeuralState('idle'); }}
            onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }} />
          {passwordError && <p className="text-xs text-error font-medium">{passwordError}</p>}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-secondary">Área de especialidade</label>
            <select required value={form.areaEspecialidade}
              onFocus={() => { setNeuralState('flow'); }}
              onBlur={() => { setNeuralState('idle'); }}
              onChange={(e) => { handleChange('areaEspecialidade', e.target.value as AreaVocacional); }}
              className="flex h-10 w-full rounded-md border border-ink-tertiary/10 bg-elevated px-3 py-2 text-sm text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-secondary">Documento comprovativo (PDF, máx 5 MB)</label>
            <p className="text-[10px] text-ink-tertiary mb-2">Cópia do diploma ou comprovativo de experiência profissional.</p>
            <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileChange}
              className="block w-full text-sm text-ink-secondary file:mr-4 file:rounded-md file:border-0 file:bg-accent/10 file:text-accent file:px-3 file:py-2 file:text-xs file:font-bold hover:file:bg-accent/20 cursor-pointer" />
            {docFile ? <p className="text-xs font-medium text-emerald-500 mt-1">✓ {docFile.name}</p> : null}
            {docError ? <p className="text-xs text-error mt-1">{docError}</p> : null}
          </div>

          <Button type="submit" className="w-full" isLoading={mutation.isPending}>Submeter para Validação →</Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-tertiary">
          Não és mentor?{' '}
          <Link to="/criar-conta/estudante" className="text-accent font-semibold hover:underline">Estudante</Link>
          {' '}|{' '}
          <Link to="/criar-conta/instituicao" className="text-accent font-semibold hover:underline">Instituição</Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
