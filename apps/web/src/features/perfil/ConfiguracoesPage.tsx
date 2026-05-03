import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Spinner, Button } from '@/components/ui';
import { Palette, Bell, ShieldCheck, Globe, Key, Users, Lock, Eye } from 'lucide-react';
import { http } from '@/lib/api/http';
import { toast } from '@/hooks/useToast';
import type { VisibilitySettings, PerfilCompleto, UpdatePerfilPayload, FieldVisibility } from '@pdc/shared';

/**
 * NotificationPreferences - Interface local para manter a inteligência do sistema.
 * Embora o schema Zod do PerfilCompleto ainda não tenha estas chaves estritas,
 * a UI deve manter a funcionalidade para futura persistência no backend.
 */
interface NotificationPreferences {
  emailMensagens: boolean;
  emailConquistas: boolean;
  emailMentorias: boolean;
  emailNewsletter: boolean;
}

type PerfilComNotificacoes = PerfilCompleto & {
  notificationPreferences?: NotificationPreferences;
};

type UpdatePerfilComNotificacoesPayload = UpdatePerfilPayload & {
  notificationPreferences?: NotificationPreferences;
};

const DEFAULT_NOTIF_PREFS: NotificationPreferences = {
  emailMensagens: true,
  emailConquistas: true,
  emailMentorias: true,
  emailNewsletter: false,
};

const TABS = [
  { id: 'aparencia', label: 'Aparência', icon: Palette },
  { id: 'privacidade', label: 'Privacidade', icon: ShieldCheck },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'seguranca', label: 'Segurança', icon: Key },
] as const;

const VISIBILITY_FIELDS: Array<{ key: keyof VisibilitySettings; label: string }> = [
  { key: 'bio', label: 'Biografia e Perfil' },
  { key: 'email', label: 'Endereço de Email' },
  { key: 'telefone', label: 'Telemóvel' },
  { key: 'areasInteresse', label: 'Áreas de Interesse' },
  { key: 'competencias', label: 'Competências Técnicas' },
  { key: 'vinculos', label: 'Lista de Vínculos' },
  { key: 'miniFeed', label: 'Atividades no Feed' },
];

type ConfigTab = (typeof TABS)[number]['id'];

export function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<ConfigTab>('aparencia');
  const queryClient = useQueryClient();

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['perfil', 'config'],
    queryFn: () => http.get<PerfilComNotificacoes>('/perfis/me'),
  });

  const DEFAULT_VIS: VisibilitySettings = {
    email: 'privado',
    telefone: 'privado',
    miniFeed: 'publico',
    vinculos: 'publico',
    bio: 'publico',
    socialLinks: 'vinkulated',
    areasInteresse: 'publico',
    competencias: 'publico',
    historicoProfissional: 'vinkulated',
    formacaoAcademica: 'vinkulated',
  };

  // Local state prevents reset on re-fetch when backend doesn't persist yet
  const [visSettings, setVisSettings] = useState(DEFAULT_VIS);
  const [notifPrefs, setNotifPrefs] = useState(DEFAULT_NOTIF_PREFS);

  useEffect(() => {
    if (perfil?.visibilitySettings) setVisSettings(perfil.visibilitySettings);
    if (perfil?.notificationPreferences) setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...perfil.notificationPreferences });
  }, [perfil]);

  const mutation = useMutation({
    mutationFn: (data: UpdatePerfilComNotificacoesPayload) => http.put('/perfis/me', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['perfil', 'config'] });
      toast({ title: 'Configurações guardadas!' });
    },
    onError: () => {
      toast({ title: 'Erro ao guardar configurações', variant: 'error' });
    },
  });

  const handleVisibilityChange = (key: keyof VisibilitySettings, value: FieldVisibility) => {
    const next = { ...visSettings, [key]: value };
    setVisSettings(next);
    mutation.mutate({ visibilitySettings: next });
  };

  const handleNotifToggle = (key: keyof NotificationPreferences) => {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    mutation.mutate({ notificationPreferences: next });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-ink-primary tracking-tight">Configurações</h1>
        <p className="text-ink-secondary">Personaliza a tua experiência de autoridade no PDC.</p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Sidebar */}
        <aside className="space-y-1 lg:col-span-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); }}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'text-ink-secondary hover:bg-elevated hover:text-ink-primary'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </aside>

        {/* Content */}
        <main className="lg:col-span-3">
          <div className="rounded-3xl border border-white/5 bg-elevated p-8 shadow-sm">
            {activeTab === 'aparencia' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-ink-primary tracking-tight">Tema da Interface</h3>
                  <p className="text-sm text-ink-secondary">Escolhe entre o modo claro ou escuro (Sovereign Tech-Terracota).</p>
                  <div className="mt-6 flex items-center gap-4 rounded-2xl bg-recessed p-4 border border-white/5">
                    <ThemeToggle />
                    <span className="text-sm font-medium text-ink-primary">Alternar tema atual</span>
                  </div>
                </div>
                
                <div className="border-t border-white/5 pt-8">
                  <h3 className="text-lg font-bold text-ink-primary tracking-tight">Idioma</h3>
                  <p className="text-sm text-ink-secondary">Selecione o idioma de sua preferência para a plataforma.</p>
                  <div className="mt-4 flex items-center gap-2 text-accent">
                    <Globe size={16} />
                    <span className="text-sm font-bold">Português (AO/PT)</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacidade' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-ink-primary tracking-tight">Visibilidade do Perfil</h3>
                  <p className="text-sm text-ink-secondary mt-1">Controla quem pode ver cada campo do teu perfil público. As alterações são guardadas automaticamente.</p>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-xs text-ink-secondary bg-recessed rounded-xl p-3 border border-white/5">
                  <span className="flex items-center gap-1.5"><Eye size={12} className="text-accent" /> <strong>Público</strong> — Visível a todos</span>
                  <span className="flex items-center gap-1.5"><Users size={12} className="text-cobalt" /> <strong>Vínculos</strong> — Apenas conexões</span>
                  <span className="flex items-center gap-1.5"><Lock size={12} className="text-ink-tertiary" /> <strong>Privado</strong> — Só tu</span>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-12"><Spinner size="lg" /></div>
                ) : (
                  <div className="space-y-3">
                    {VISIBILITY_FIELDS.map((field) => (
                      <div key={field.key} className="flex items-center justify-between rounded-xl bg-recessed p-4 border border-white/5 gap-4">
                        <span className="text-sm font-semibold text-ink-primary">{field.label}</span>
                        <VisibilityToggle
                          value={visSettings[field.key]}
                          onChange={(v) => { handleVisibilityChange(field.key, v); }}
                          saving={mutation.isPending}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notificacoes' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-ink-primary tracking-tight">Preferências de Email</h3>
                <p className="text-sm text-ink-secondary mb-6">Escolhe quais notificações desejas receber no teu email.</p>
                
                {isLoading ? (
                  <div className="flex justify-center py-12"><Spinner size="lg" /></div>
                ) : (
                  <div className="space-y-4">
                    <NotifToggle label="Mensagens" desc="Receber email quando alguém te envia uma mensagem." checked={notifPrefs.emailMensagens} onChange={() => { handleNotifToggle('emailMensagens'); }} />
                    <NotifToggle label="Conquistas" desc="Receber email quando desbloqueas uma conquista." checked={notifPrefs.emailConquistas} onChange={() => { handleNotifToggle('emailConquistas'); }} />
                    <NotifToggle label="Mentorias" desc="Receber email sobre pedidos e sessões de mentoria." checked={notifPrefs.emailMentorias} onChange={() => { handleNotifToggle('emailMentorias'); }} />
                    <NotifToggle label="Newsletter" desc="Receber a newsletter periódica da plataforma." checked={notifPrefs.emailNewsletter} onChange={() => { handleNotifToggle('emailNewsletter'); }} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'seguranca' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-ink-primary tracking-tight">Segurança da Conta</h3>
                <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6 backdrop-blur-sm">
                  <h4 className="font-bold text-accent">Autenticação de Dois Factores (2FA)</h4>
                  <p className="mt-2 text-sm text-ink-secondary">Adiciona uma camada extra de segurança à tua conta usando um código de verificação no teu email.</p>
                  <Button className="mt-6" variant="secondary" size="sm" disabled>
                    Configurar 2FA (Em breve)
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <footer className="rounded-2xl bg-accent/5 border border-accent/10 p-6 text-center">
        <p className="text-[10px] uppercase tracking-widest font-bold text-accent/80">
          Nota: As preferências de aparência são guardadas localmente e aplicam-se apenas a este dispositivo.
        </p>
      </footer>
    </div>
  );
}

const VISIBILITY_OPTIONS = [
  { value: 'publico', label: 'Público', icon: Eye },
  { value: 'vinkulated', label: 'Vínculos', icon: Users },
  { value: 'privado', label: 'Privado', icon: Lock },
] as const;

function VisibilityToggle({ value, onChange, saving }: { value: FieldVisibility; onChange: (v: FieldVisibility) => void; saving?: boolean }): React.JSX.Element {
  return (
    <div className={`flex rounded-lg border border-white/10 bg-canvas overflow-hidden shrink-0 transition-opacity ${saving ? 'opacity-60 pointer-events-none' : ''}`}>
      {VISIBILITY_OPTIONS.map(({ value: optVal, label, icon: Icon }) => {
        const active = value === optVal;
        return (
          <button
            key={optVal}
            type="button"
            onClick={() => { onChange(optVal); }}
            title={label}
            className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold transition-all border-r border-white/5 last:border-r-0 ${
              active
                ? 'bg-accent text-white'
                : 'text-ink-tertiary hover:text-ink-primary hover:bg-recessed'
            }`}
          >
            <Icon size={11} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function NotifToggle({ label, desc, checked, onChange }: { label: string, desc: string, checked: boolean, onChange: () => void }) {
  return (
    <div className="flex items-start justify-between rounded-xl bg-recessed p-4 border border-white/5 transition-all hover:bg-white/[0.02]">
      <div className="space-y-1">
        <div className="text-sm font-bold text-ink-primary tracking-tight">{label}</div>
        <div className="text-xs text-ink-secondary leading-relaxed">{desc}</div>
      </div>
      <button 
        onClick={onChange}
        className={`relative h-6 w-11 rounded-full transition-all duration-300 ${checked ? 'bg-accent' : 'bg-elevated border border-white/10'}`}
      >
        <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all shadow-sm ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}
