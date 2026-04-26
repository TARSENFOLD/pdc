import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Spinner, Button } from '@/components/ui';
import { Palette, Bell, ShieldCheck, Globe, Key } from 'lucide-react';
import { http } from '@/lib/api/http';
import { toast } from '@/hooks/useToast';
import type { VisibilitySettings, NotificationPreferences, PerfilCompleto } from '@pdc/shared';

export function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'aparencia' | 'privacidade' | 'notificacoes' | 'seguranca'>('aparencia');
  const queryClient = useQueryClient();

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['perfil', 'config'],
    queryFn: () => http.get<PerfilCompleto>('/perfis/me'),
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<PerfilCompleto>) => http.put('/perfis/me', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['perfil', 'config'] });
      toast({ title: 'Configurações guardadas!' });
    },
    onError: () => {
      toast({ title: 'Erro ao guardar configurações', variant: 'error' });
    },
  });

  const visSettings: VisibilitySettings = (perfil?.visibilitySettings as VisibilitySettings) ?? {
    nome: 'publico',
    email: 'privado',
    areaInteresse: 'publico',
    instituicao: 'publico',
    reputacao: 'publico',
    conquistas: 'publico',
    votos: 'publico',
    atividades: 'publico'
  };

  const notifPrefs: NotificationPreferences = (perfil?.notificationPreferences as NotificationPreferences) ?? {
    emailMensagens: true,
    emailConquistas: true,
    emailMentorias: true,
    emailNewsletter: false
  };

  const handleVisibilityChange = (key: keyof VisibilitySettings, value: string) => {
    mutation.mutate({
      visibilitySettings: { ...visSettings, [key]: value }
    });
  };

  const handleNotifToggle = (key: keyof NotificationPreferences) => {
    mutation.mutate({
      notificationPreferences: { ...notifPrefs, [key]: !notifPrefs[key] }
    });
  };

  const tabs = [
    { id: 'aparencia', label: 'Aparência', icon: Palette },
    { id: 'privacidade', label: 'Privacidade', icon: ShieldCheck },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    { id: 'seguranca', label: 'Segurança', icon: Key },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-ink-primary tracking-tight">Configurações</h1>
        <p className="text-ink-secondary">Personaliza a tua experiência de autoridade no PDC.</p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Sidebar */}
        <aside className="space-y-1 lg:col-span-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as typeof activeTab); }}
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
                  <p className="text-sm text-ink-secondary">Atualmente disponível apenas em Português.</p>
                  <div className="mt-4 flex items-center gap-2 text-accent">
                    <Globe size={16} />
                    <span className="text-sm font-bold">Português (Angola)</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacidade' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-ink-primary tracking-tight">Visibilidade do Perfil</h3>
                <p className="text-sm text-ink-secondary mb-6">Controla quem pode ver os detalhes do teu perfil público (Privacidade V2).</p>
                
                {isLoading ? (
                  <div className="flex justify-center py-12"><Spinner size="lg" /></div>
                ) : (
                  <div className="space-y-4">
                    {[
                      { key: 'nome', label: 'Nome Completo' },
                      { key: 'email', label: 'Endereço de Email' },
                      { key: 'areaInteresse', label: 'Área de Interesse' },
                      { key: 'instituicao', label: 'Instituição de Ensino' },
                      { key: 'reputacao', label: 'Pontuação de Reputação' },
                      { key: 'conquistas', label: 'Badges e Conquistas' },
                    ].map((field) => (
                      <div key={field.key} className="flex items-center justify-between rounded-xl bg-recessed p-4 border border-white/5">
                        <span className="text-sm font-medium text-ink-primary">{field.label}</span>
                        <VisibilitySelect 
                          value={visSettings[field.key as keyof VisibilitySettings] ?? 'privado'} 
                          onChange={(v) => { handleVisibilityChange(field.key as keyof VisibilitySettings, v); }} 
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
                    <NotifToggle label="Mensagens" desc="Receber email quando alguém te envia uma mensagem." checked={!!notifPrefs.emailMensagens} onChange={() => { handleNotifToggle('emailMensagens'); }} />
                    <NotifToggle label="Conquistas" desc="Receber email quando desbloqueas uma conquista." checked={!!notifPrefs.emailConquistas} onChange={() => { handleNotifToggle('emailConquistas'); }} />
                    <NotifToggle label="Mentorias" desc="Receber email sobre pedidos e sessões de mentoria." checked={!!notifPrefs.emailMentorias} onChange={() => { handleNotifToggle('emailMentorias'); }} />
                    <NotifToggle label="Newsletter" desc="Receber a newsletter periódica da plataforma." checked={!!notifPrefs.emailNewsletter} onChange={() => { handleNotifToggle('emailNewsletter'); }} />
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

function VisibilitySelect({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  return (
    <select 
      value={value} 
      onChange={(e) => { onChange(e.target.value); }}
      className="rounded-lg border border-white/10 bg-canvas p-2 text-xs font-bold text-ink-primary focus:ring-1 focus:ring-accent"
    >
      <option value="publico">Público</option>
      <option value="vinculos">Apenas Vínculos</option>
      <option value="privado">Privado</option>
    </select>
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
