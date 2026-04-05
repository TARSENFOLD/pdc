import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi, type LoginResponse } from '@/lib/api/auth';
import { Button, Input } from '@/components/ui';
import type { RegistoEstudantePayload } from '@pdc/shared';

const AREAS = ['Tecnologia', 'Saúde', 'Direito', 'Engenharia', 'Artes', 'Ciências', 'Educação'] as const;
const NIVEIS = ['Secundário', 'Licenciatura', 'Mestrado', 'Doutoramento'] as const;

export function RegistoEstudantePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome: '', email: '', password: '', areaInteresse: '', nivelEnsino: '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (payload: RegistoEstudantePayload) => authApi.registarEstudante(payload),
    onSuccess: (result: LoginResponse) => { 
      // result.canal is 'email'
      navigate('/verificar', { state: { canal: result.canal, from: '/app/dashboard' }, replace: true }); 
    },
    onError: (err: Error & { body?: { error?: string } }) => {
      setError(err.body?.error ?? 'Erro ao criar conta.');
    },
  });

  function handleChange(key: keyof RegistoEstudantePayload, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    mutation.mutate(form);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
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
            <select required value={form.areaInteresse} onChange={(e) => { handleChange('areaInteresse', e.target.value); }}
              className="flex h-10 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber">
              <option value="">Seleciona…</option>
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
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

        <p className="mt-6 text-center text-sm text-text-muted">
          <Link to="/criar-conta" className="text-amber hover:underline">← Voltar</Link>
        </p>
      </div>
    </div>
  );
}
