import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi, type LoginResponse } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/http';
import { Button, Input } from '@/components/ui';
import { AuthSplitLayout } from './AuthSplitLayout';
import type { RegistoEstudantePayload, AreaVocacional } from '@pdc/shared';
import { ArrowLeft } from 'lucide-react';

const AREAS: Array<{ value: AreaVocacional; label: string }> = [
  { value: 'TECNOLOGIA', label: 'Tecnologia' },
  { value: 'SAUDE', label: 'Saúde' },
  { value: 'DIREITO', label: 'Direito' },
  { value: 'ENGENHARIA', label: 'Engenharia' },
  { value: 'ARTES', label: 'Artes' },
  { value: 'CIENCIAS_SOCIAIS', label: 'Ciências Sociais' },
  { value: 'EDUCACAO', label: 'Educação' },
  { value: 'AGRONOMIA', label: 'Agronomia' },
  { value: 'GESTAO', label: 'Gestão' },
  { value: 'OUTRA', label: 'Outro' },
];

const NIVEIS = ['Secundário', 'Licenciatura', 'Mestrado', 'Doutoramento'] as const;

export function RegistoEstudantePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegistoEstudantePayload>({
    nome: '', email: '', password: '', areaInteresse: 'TECNOLOGIA', nivelEnsino: '',
  });
  const [error, setError] = useState('');

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
        const body = err.body as Record<string, unknown> | undefined;
        if (typeof body?.error === 'string') message = body.error;
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
    mutation.mutate(form);
  }

  return (
    <AuthSplitLayout role="estudante">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8">
        <h1 className="text-2xl font-bold text-text-primary">Conta de Estudante</h1>
        <p className="mt-1 text-sm text-text-secondary">Preenche os dados para começar.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error ? <div className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">{error}</div> : null}

          <Input label="Nome completo" required value={form.nome} onChange={(e) => { handleChange('nome', e.target.value); }} />
          <Input label="Email" type="email" required value={form.email} onChange={(e) => { handleChange('email', e.target.value); }} />
          <Input label="Palavra-passe" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" value={form.password} onChange={(e) => { handleChange('password', e.target.value); }} />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Área de interesse</label>
            <select required value={form.areaInteresse} onChange={(e) => { handleChange('areaInteresse', e.target.value as AreaVocacional); }}
              className="flex h-10 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber">
              {AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Nível de ensino</label>
            <select required value={form.nivelEnsino} onChange={(e) => { handleChange('nivelEnsino', e.target.value); }}
              className="flex h-10 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber">
              <option value="">Seleciona…</option>
              {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <Button type="submit" className="w-full" isLoading={mutation.isPending}>Criar conta</Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted lg:block hidden">
          <Link to="/criar-conta" className="inline-flex items-center gap-1 text-amber hover:underline">
            <ArrowLeft size={16} aria-hidden={true} />
            Voltar
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
