import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, GraduationCap, ShieldCheck, UserCheck } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/auth-context';
import type { OAuthFinalizarRoleChoice, Role } from '@pdc/shared';

type OnboardingRole = Extract<Role, 'estudante' | 'mentor' | 'instituicao'>;

function getErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('body' in error)) return 'Não foi possível concluir a validação.';
  const body = error.body;
  if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') return body.error;
  return 'Não foi possível concluir a validação.';
}

export function FinalizarOAuthPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isUpgrade = searchParams.get('upgrade') === 'true';

  const [role, setRole] = useState<OnboardingRole>('estudante');
  const [areaEspecialidade, setAreaEspecialidade] = useState('');
  const [nomeInstituicao, setNomeInstituicao] = useState('');
  const [tipoInstituicao, setTipoInstituicao] = useState('');
  const [documentoUrl, setDocumentoUrl] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  async function handleChooseRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const payload = buildPayload();
      await authApi.finalizarOAuthRole(payload);
      navigate('/app', { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  function buildPayload(): OAuthFinalizarRoleChoice {
    if (role === 'mentor') {
      return {
        role,
        areaEspecialidade,
        documentos: [{ tipo: 'comprovativo', url: documentoUrl }],
      };
    }

    if (role === 'instituicao') {
      return {
        role,
        nomeInstituicao,
        tipoInstituicao,
        documentos: [{ tipo: 'comprovativo', url: documentoUrl }],
      };
    }

    return { role: 'estudante' };
  }

  return (
    <main className="min-h-screen bg-canvas px-6 py-10 text-ink-primary">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-4xl flex-col justify-center">
        <div className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
            <ShieldCheck size={14} />
            OAuth validado
          </div>
          <h1 className="font-authority text-4xl font-black tracking-tight sm:text-5xl">
            Finalizar conta
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-secondary">
            {isUpgrade
              ? 'Completa o perfil institucional para ativar o papel correto no PDC.'
              : 'Escolhe o teu papel para ativar a conta no PDC.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={(event) => { void handleChooseRole(event); }} className="space-y-7">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { id: 'estudante' as const, label: 'Estudante', icon: GraduationCap },
                { id: 'mentor' as const, label: 'Mentor', icon: UserCheck },
                { id: 'instituicao' as const, label: 'Instituição', icon: Building2 },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setRole(item.id); }}
                  className={`flex min-h-32 flex-col items-start justify-between rounded-lg border p-5 text-left transition ${
                    role === item.id
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-ink-tertiary/10 bg-elevated text-ink-secondary hover:border-accent/40'
                  }`}
                >
                  <item.icon size={24} />
                  <span className="text-sm font-black uppercase tracking-widest">{item.label}</span>
                </button>
              ))}
            </div>

            {role === 'mentor' && (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Área de especialidade" value={areaEspecialidade} onChange={setAreaEspecialidade} required />
                <Field label="URL do comprovativo" type="url" value={documentoUrl} onChange={setDocumentoUrl} required />
              </div>
            )}

            {role === 'instituicao' && (
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Nome da instituição" value={nomeInstituicao} onChange={setNomeInstituicao} required />
                <Field label="Tipo de instituição" value={tipoInstituicao} onChange={setTipoInstituicao} required />
                <Field label="URL do comprovativo" type="url" value={documentoUrl} onChange={setDocumentoUrl} required />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-14 w-full rounded-lg bg-ink-primary px-6 text-xs font-black uppercase tracking-widest text-canvas transition hover:bg-accent hover:text-ink-on-accent disabled:opacity-50"
            >
              {isSubmitting ? 'A finalizar...' : 'Finalizar e entrar'}
            </button>
          </form>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: 'text' | 'url';
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-ink-tertiary">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => { onChange(event.target.value); }}
        className="h-12 w-full rounded-lg border border-ink-tertiary/10 bg-recessed px-4 text-sm text-ink-primary outline-none transition placeholder:text-ink-tertiary focus:border-accent focus:ring-1 focus:ring-accent"
      />
    </label>
  );
}
