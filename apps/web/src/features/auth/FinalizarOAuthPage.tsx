import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, GraduationCap, ShieldCheck, UserCheck } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/auth-context';
import {
  OAuthFinalizarRoleChoiceSchema,
  resolveEstadoMenoridade,
  type Role,
} from '@pdc/shared';
import { LegalConsentField } from './LegalConsentField';
import { buildAceiteLegal, emptyConsentimentoEncarregado } from './registrationCompliance';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

type OnboardingRole = Extract<Role, 'estudante' | 'mentor' | 'instituicao'>;

const TIPOS_INSTITUICAO = [
  { value: 'universidade', label: 'Universidade' },
  { value: 'instituto', label: 'Instituto' },
  { value: 'escola', label: 'Escola' },
  { value: 'centro_formacao', label: 'Centro de Formação' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'ong', label: 'ONG' },
  { value: 'laboratorio', label: 'Laboratório' },
  { value: 'outro', label: 'Outro' },
] as const;

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
  const { isEnabled } = useFeatureFlags();
  const externalCreatorEnabled = isEnabled('external_creator_onboarding_enabled');

  const [role, setRole] = useState<OnboardingRole>('estudante');
  const [areaEspecialidade, setAreaEspecialidade] = useState('');
  const [nomeInstituicao, setNomeInstituicao] = useState('');
  const [tipoInstituicao, setTipoInstituicao] = useState('universidade');
  const [documentoUrl, setDocumentoUrl] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [aceitouLegal, setAceitouLegal] = useState(false);
  const [consentimentoEncarregado, setConsentimentoEncarregado] = useState(emptyConsentimentoEncarregado);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const estudanteMenor = role === 'estudante' && resolveEstadoMenoridade(dataNascimento) === 'menor';

  if (!isLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  async function handleChooseRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const parsed = OAuthFinalizarRoleChoiceSchema.safeParse(buildPayload());
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? 'Confirma os dados obrigatórios antes de continuar.');
        return;
      }
      const payload = parsed.data;
      await authApi.finalizarOAuthRole(payload);
      navigate('/app', { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  function buildPayload(): unknown {
    const compliance = {
      dataNascimento,
      aceiteLegal: aceitouLegal ? buildAceiteLegal() : undefined,
      ...(estudanteMenor ? { consentimentoEncarregado } : {}),
    };

    if (role === 'mentor') {
      return {
        role,
        ...compliance,
        areaEspecialidade,
        documentos: [{ tipo: 'comprovativo', url: documentoUrl }],
      };
    }

    if (role === 'instituicao') {
      return {
        role,
        ...compliance,
        nomeInstituicao,
        tipoInstituicao,
      };
    }

    return { role: 'estudante', ...compliance };
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
        {!externalCreatorEnabled && (
          <div className="mb-6 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-ink-secondary">
            O onboarding de Mentor e Instituição está temporariamente indisponível.
          </div>
        )}

        <form onSubmit={(event) => { void handleChooseRole(event); }} className="space-y-7">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { id: 'estudante' as const, label: 'Estudante', icon: GraduationCap },
                { id: 'mentor' as const, label: 'Mentor', icon: UserCheck },
                { id: 'instituicao' as const, label: 'Instituição', icon: Building2 },
              ].filter((item) => item.id === 'estudante' || externalCreatorEnabled).map((item) => (
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
                <Field id="oauth-area-especialidade" label="Área de especialidade" value={areaEspecialidade} onChange={setAreaEspecialidade} required />
                <Field id="oauth-documento-mentor" label="URL do comprovativo" type="url" value={documentoUrl} onChange={setDocumentoUrl} required />
              </div>
            )}

            {role === 'instituicao' && (
              <div className="grid gap-4 md:grid-cols-2">
                <Field id="oauth-nome-instituicao" label="Nome da instituição" value={nomeInstituicao} onChange={setNomeInstituicao} required />
                <label htmlFor="oauth-tipo-instituicao" className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-ink-tertiary">
                    Tipo de instituição
                  </span>
                  <select
                    id="oauth-tipo-instituicao"
                    value={tipoInstituicao}
                    onChange={(event) => { setTipoInstituicao(event.target.value); }}
                    className="h-12 w-full rounded-lg border border-ink-tertiary/10 bg-recessed px-4 text-sm text-ink-primary outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                    required
                  >
                    {TIPOS_INSTITUICAO.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                id="oauth-data-nascimento"
                label="Data de nascimento"
                type="date"
                value={dataNascimento}
                onChange={setDataNascimento}
                required
              />
            </div>

            {estudanteMenor && (
              <div className="grid gap-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 md:grid-cols-3">
                <Field
                  id="oauth-encarregado-nome"
                  label="Nome do encarregado"
                  value={consentimentoEncarregado.nome}
                  onChange={(nome) => { setConsentimentoEncarregado((current) => ({ ...current, nome })); }}
                  required
                />
                <Field
                  id="oauth-encarregado-email"
                  label="Email do encarregado"
                  type="email"
                  value={consentimentoEncarregado.email}
                  onChange={(email) => { setConsentimentoEncarregado((current) => ({ ...current, email })); }}
                  required
                />
                <label htmlFor="oauth-encarregado-parentesco" className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-ink-tertiary">
                    Parentesco
                  </span>
                  <select
                    id="oauth-encarregado-parentesco"
                    value={consentimentoEncarregado.parentesco}
                    onChange={(event) => {
                      const parentesco = event.target.value;
                      if (parentesco === 'mae' || parentesco === 'pai' || parentesco === 'tutor_legal' || parentesco === 'outro') {
                        setConsentimentoEncarregado((current) => ({ ...current, parentesco }));
                      }
                    }}
                    className="h-12 w-full rounded-lg border border-ink-tertiary/10 bg-recessed px-4 text-sm text-ink-primary outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                  >
                    <option value="tutor_legal">Tutor legal</option>
                    <option value="mae">Mãe</option>
                    <option value="pai">Pai</option>
                    <option value="outro">Outro</option>
                  </select>
                </label>
              </div>
            )}

            <LegalConsentField checked={aceitouLegal} onCheckedChange={setAceitouLegal} />

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
  type?: 'text' | 'url' | 'date' | 'email';
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
        className="h-12 w-full rounded-lg border border-ink-tertiary/10 bg-recessed px-4 text-sm text-ink-primary outline-none transition placeholder:text-ink-tertiary focus:border-accent focus:ring-1 focus:ring-accent"
      />
    </label>
  );
}
