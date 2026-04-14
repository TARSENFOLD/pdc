import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Spinner } from '@/components/ui';
import { Palette, Bell, Eye } from 'lucide-react';
import { perfisApi } from '@/lib/api/perfis';
import type { VisibilitySettings, NotificationPreferences, FieldVisibility } from '@pdc/shared';

type Tab = 'aparencia' | 'privacidade' | 'notificacoes';

const VISIBILITY_OPTIONS: { value: FieldVisibility; label: string }[] = [
  { value: 'publico', label: 'Público' },
  { value: 'conexoes', label: 'Conexões' },
  { value: 'privado', label: 'Privado' },
];

const PRIVACY_FIELDS: { key: keyof VisibilitySettings; label: string; description: string }[] = [
  { key: 'bio', label: 'Bio', description: 'A tua descrição pessoal.' },
  { key: 'telefone', label: 'Telefone', description: 'O teu número de contacto.' },
  { key: 'socialLinks', label: 'Redes Sociais', description: 'LinkedIn, GitHub, website, etc.' },
  { key: 'areasInteresse', label: 'Áreas de Interesse', description: 'As áreas que te interessam.' },
  { key: 'competencias', label: 'Competências', description: 'As tuas skills e competências.' },
];

function VisibilitySelect({ value, onChange }: { value: FieldVisibility; onChange: (v: FieldVisibility) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as FieldVisibility)}
      className="rounded-md border border-border bg-surface-raised px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber"
    >
      {VISIBILITY_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export function ConfiguracoesPage() {
  const [tab, setTab] = useState<Tab>('aparencia');
  const qc = useQueryClient();

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['perfis', 'me'],
    queryFn: () => perfisApi.getMe(),
  });

  const visSettings: VisibilitySettings = (perfil?.visibilitySettings as VisibilitySettings) ?? {};
  const notifPrefs: NotificationPreferences = (perfil?.notificationPreferences as NotificationPreferences) ?? {};

  const visMutation = useMutation({
    mutationFn: (visibilitySettings: VisibilitySettings) => perfisApi.update({ visibilitySettings }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['perfis', 'me'] }); },
  });

  const notifMutation = useMutation({
    mutationFn: (notificationPreferences: NotificationPreferences) => perfisApi.update({ notificationPreferences }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['perfis', 'me'] }); },
  });

  function handleVisibilityChange(key: keyof VisibilitySettings, value: FieldVisibility) {
    visMutation.mutate({ ...visSettings, [key]: value });
  }

  function handleNotifToggle(key: keyof NotificationPreferences) {
    notifMutation.mutate({ ...notifPrefs, [key]: !notifPrefs[key] });
  }

  const tabs: { id: Tab; label: string; icon: typeof Palette }[] = [
    { id: 'aparencia', label: 'Aparência', icon: Palette },
    { id: 'privacidade', label: 'Privacidade', icon: Eye },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 text-center lg:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">Configurações</h1>
        <p className="mt-2 text-text-secondary">Gere a sua conta e preferências da plataforma.</p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Nav Lateral */}
        <nav className="flex flex-row gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-surface-raised font-bold text-accent shadow-sm ring-1 ring-border'
                  : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
              }`}
            >
              <t.icon size={18} />
              {t.label}
            </button>
          ))}
        </nav>

        {/* Conteúdo */}
        <div className="lg:col-span-3">
          {tab === 'aparencia' && <AppearanceSection />}

          {tab === 'privacidade' && (
            <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
              <div className="border-b border-border bg-surface-alt/50 px-6 py-4">
                <h2 className="text-lg font-bold text-text-primary">Privacidade do Perfil</h2>
                <p className="text-sm text-text-secondary">Controla quem vê cada campo do teu perfil público.</p>
              </div>
              <div className="divide-y divide-border">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Spinner size="lg" /></div>
                ) : (
                  PRIVACY_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center justify-between px-6 py-4">
                      <div>
                        <h3 className="text-sm font-bold text-text-primary">{field.label}</h3>
                        <p className="mt-0.5 text-xs text-text-secondary">{field.description}</p>
                      </div>
                      <VisibilitySelect
                        value={visSettings[field.key] ?? 'publico'}
                        onChange={(v) => handleVisibilityChange(field.key, v)}
                      />
                    </div>
                  ))
                )}
              </div>
              {visMutation.isSuccess && (
                <div className="px-6 py-3 text-sm text-success">Preferências de privacidade guardadas.</div>
              )}
              {visMutation.isError && (
                <div className="px-6 py-3 text-sm text-error">Erro ao guardar privacidade.</div>
              )}
            </section>
          )}

          {tab === 'notificacoes' && (
            <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
              <div className="border-b border-border bg-surface-alt/50 px-6 py-4">
                <h2 className="text-lg font-bold text-text-primary">Notificações por Email</h2>
                <p className="text-sm text-text-secondary">Escolhe sobre que eventos queres ser notificado.</p>
              </div>
              <div className="divide-y divide-border">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Spinner size="lg" /></div>
                ) : (
                  <>
                    <NotifToggle label="Mensagens" desc="Receber email quando alguém te envia uma mensagem." checked={notifPrefs.emailMensagens ?? true} onChange={() => handleNotifToggle('emailMensagens')} />
                    <NotifToggle label="Conquistas" desc="Receber email quando desbloqueas uma conquista." checked={notifPrefs.emailConquistas ?? true} onChange={() => handleNotifToggle('emailConquistas')} />
                    <NotifToggle label="Mentorias" desc="Receber email sobre pedidos e sessões de mentoria." checked={notifPrefs.emailMentorias ?? true} onChange={() => handleNotifToggle('emailMentorias')} />
                    <NotifToggle label="Newsletter" desc="Receber a newsletter periódica da plataforma." checked={notifPrefs.emailNewsletter ?? true} onChange={() => handleNotifToggle('emailNewsletter')} />
                  </>
                )}
              </div>
              {notifMutation.isSuccess && (
                <div className="px-6 py-3 text-sm text-success">Preferências de notificação guardadas.</div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function NotifToggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div>
        <h3 className="text-sm font-bold text-text-primary">{label}</h3>
        <p className="mt-0.5 text-xs text-text-secondary">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber focus:ring-offset-2 ${
          checked ? 'bg-accent' : 'bg-surface-raised ring-1 ring-border'
        }`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );
}

function AppearanceSection() {
  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border bg-surface-alt/50 px-6 py-4">
          <h2 className="text-lg font-bold text-text-primary">Personalização</h2>
          <p className="text-sm text-text-secondary">Ajusta a interface para o teu conforto visual.</p>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Tema da Interface</h3>
            <p className="mt-1 text-sm text-text-secondary">Seleciona como preferes visualizar a plataforma.</p>
          </div>

          <ThemeToggle variant="full" className="max-w-md" />

          <div className="mt-10 space-y-6 border-t border-border pt-8">
            <div className="flex items-center justify-between group">
              <div>
                <h3 className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors">Reduzir Movimento</h3>
                <p className="mt-0.5 text-xs text-text-secondary">Desativa transições e animações para uma navegação mais sóbria.</p>
              </div>
              <button className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-surface-raised transition-colors duration-200 ease-in-out focus:outline-none ring-1 ring-border">
                <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
              </button>
            </div>

            <div className="flex items-center justify-between group opacity-50 cursor-not-allowed">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Fonte de Alta Legibilidade</h3>
                <p className="mt-0.5 text-xs text-text-secondary">Utiliza fontes otimizadas para leitura prolongada.</p>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted bg-surface-raised px-2 py-1 rounded border border-border">Brevemente</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-6 rounded-xl bg-accent-trust/5 border border-accent-trust/20 p-4">
        <p className="text-xs leading-relaxed text-accent-trust/80">
          <strong>Nota:</strong> As preferências de aparência são guardadas localmente no teu navegador e aplicam-se apenas a este dispositivo.
        </p>
      </footer>
    </>
  );
}
