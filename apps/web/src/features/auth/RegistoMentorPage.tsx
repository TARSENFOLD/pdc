import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { Button, Input } from '@/components/ui';
import { AuthSplitLayout } from './AuthSplitLayout';
import type { RegistoMentorPayload } from '@pdc/shared';

const AREAS = ['Tecnologia', 'Saúde', 'Direito', 'Engenharia', 'Artes', 'Ciências', 'Educação'] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function RegistoMentorPage() {
  const [form, setForm] = useState({
    nome: '', email: '', password: '', areaEspecialidade: '',
  });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docError, setDocError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (payload: RegistoMentorPayload) => authApi.registarMentor(payload),
    onSuccess: () => { setSuccess(true); },
    onError: (err: Error & { body?: { error?: string } }) => {
      setError(err.body?.error ?? 'Erro ao criar conta.');
    },
  });

  function handleChange(key: keyof typeof form, value: string) {
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
    // TODO: upload docFile to media endpoint and get URL
    mutation.mutate(form);
  }

  if (success) {
    return (
      <AuthSplitLayout role="mentor">
        <div className="max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
          <span className="text-4xl">✅</span>
          <h1 className="mt-4 text-xl font-bold text-text-primary">Conta criada com sucesso</h1>
          <p className="mt-2 text-sm text-text-secondary">
            A tua conta de mentor será validada pela equipa. Receberás um email quando estiver activa.
          </p>
          <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-amber hover:underline">
            Ir para login →
          </Link>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout role="mentor">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8">
        <h1 className="text-2xl font-bold text-text-primary">Conta de Mentor</h1>
        <p className="mt-1 text-sm text-text-secondary">Partilha a tua experiência com estudantes.</p>

        <div className="mt-4 rounded-lg border border-amber/20 bg-amber/5 p-3 text-sm text-amber">
          ⚠️ Contas de mentor requerem validação. O acesso poderá demorar até 48h.
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error ? <div className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">{error}</div> : null}

          <Input label="Nome completo" required value={form.nome} onChange={(e) => { handleChange('nome', e.target.value); }} />
          <Input label="Email" type="email" required value={form.email} onChange={(e) => { handleChange('email', e.target.value); }} />
          <Input label="Palavra-passe" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" value={form.password} onChange={(e) => { handleChange('password', e.target.value); }} />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Área de especialidade</label>
            <select required value={form.areaEspecialidade} onChange={(e) => { handleChange('areaEspecialidade', e.target.value); }}
              className="flex h-10 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber">
              <option value="">Seleciona…</option>
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Documento comprovativo (PDF, máx 5 MB)</label>
            <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileChange}
              className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-surface-raised file:px-3 file:py-2 file:text-sm file:text-text-primary hover:file:bg-white/10" />
            {docFile ? <p className="text-xs text-text-muted">{docFile.name}</p> : null}
            {docError ? <p className="text-xs text-error">{docError}</p> : null}
          </div>

          <Button type="submit" className="w-full" isLoading={mutation.isPending}>Criar conta</Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted lg:block hidden">
          <Link to="/criar-conta" className="text-amber hover:underline">← Voltar</Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
