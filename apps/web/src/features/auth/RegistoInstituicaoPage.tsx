import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/http';
import { Button, Input } from '@/components/ui';
import { AuthSplitLayout } from './AuthSplitLayout';
import { CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import type { RegistoInstituicaoPayload } from '@pdc/shared';

const TIPOS = [
  { value: 'universidade', label: 'Universidade' },
  { value: 'escola_tecnica', label: 'Escola Técnica' },
  { value: 'centro_formacao', label: 'Centro de Formação' },
  { value: 'outro', label: 'Outro' }
] as const;

const REGIOES = [
  'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango', 'Cuanza Norte', 
  'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla', 'Luanda', 'Lunda Norte', 
  'Lunda Sul', 'Malanje', 'Moxico', 'Namibe', 'Uíge', 'Zaire'
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function RegistoInstituicaoPage() {
  const [form, setForm] = useState({
    nome: '', 
    email: '', 
    password: '', 
    regiao: '', 
    tipo: 'universidade' as any, 
    nif: '',
  });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docError, setDocError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (payload: RegistoInstituicaoPayload) => authApi.registarInstituicao(payload),
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

  function handleChange<K extends keyof typeof form>(key: K, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setDocError('');
    if (!file) { setDocFile(null); return; }
    if (file.type !== 'application/pdf') { setDocError('Apenas ficheiros PDF.'); setDocFile(null); return; }
    if (file.size > MAX_FILE_SIZE) { setDocError('Ficheiro excede 10 MB.'); setDocFile(null); return; }
    setDocFile(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    
    mutation.mutate({
      ...form,
      nomeInstituicao: form.nome,
      documentos: docFile ? [docFile.name] : [],
    });
  }

  if (success) {
    return (
      <AuthSplitLayout role="instituicao">
        <div className="max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-xl">
          <CheckCircle size={48} aria-hidden={true} className="text-emerald-500 mx-auto" />
          <h1 className="mt-6 text-2xl font-bold text-text-primary">Registo submetido</h1>
          <p className="mt-3 text-text-secondary">
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
    <AuthSplitLayout role="instituicao">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-text-primary">Conta Institucional</h1>
        <p className="mt-1 text-sm text-text-secondary">Publica experiências e atrai os melhores talentos para a tua instituição.</p>

        <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-400 leading-relaxed">
          <AlertTriangle size={14} aria-hidden={true} className="inline-block mr-1.5 align-text-bottom" /> 
          <strong>Importante:</strong> Instituições requerem verificação de NIF e documentos oficiais para publicação de conteúdos.
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error ? <div className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">{error}</div> : null}

          <Input label="Nome da instituição" required value={form.nome} onChange={(e) => { handleChange('nome', e.target.value); }} />
          <Input label="NIF" required value={form.nif} placeholder="Ex: 5000123456" onChange={(e) => { handleChange('nif', e.target.value); }} />
          <Input label="Email institucional" type="email" required value={form.email} onChange={(e) => { handleChange('email', e.target.value); }} />
          <Input label="Palavra-passe" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" value={form.password} onChange={(e) => { handleChange('password', e.target.value); }} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">Tipo</label>
              <select required value={form.tipo} onChange={(e) => { handleChange('tipo', e.target.value); }}
                className="flex h-10 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">Região</label>
              <select required value={form.regiao} onChange={(e) => { handleChange('regiao', e.target.value); }}
                className="flex h-10 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                <option value="">Seleciona…</option>
                {REGIOES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Documento de acreditação (PDF, máx 10 MB)</label>
            <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileChange}
              className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-emerald-500/10 file:text-emerald-400 file:px-3 file:py-2 file:text-xs file:font-bold hover:file:bg-emerald-500/20 cursor-pointer" />
            {docFile ? <p className="text-xs font-medium text-emerald-500 mt-1">✓ {docFile.name}</p> : null}
            {docError ? <p className="text-xs text-error mt-1">{docError}</p> : null}
          </div>

          <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600" isLoading={mutation.isPending}>Registar Instituição →</Button>
        </form>

        <p className="mt-8 text-center text-sm text-text-muted">
          <Link to="/criar-conta" className="inline-flex items-center gap-1 text-emerald-400 hover:underline">
            <ArrowLeft size={16} aria-hidden={true} />
            Voltar para escolha de perfil
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
