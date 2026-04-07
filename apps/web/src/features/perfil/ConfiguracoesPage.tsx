import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Palette, Bell, Shield, User } from 'lucide-react';

export function ConfiguracoesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 text-center lg:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">Configurações</h1>
        <p className="mt-2 text-text-secondary">Gere a sua conta e preferências da plataforma.</p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Nav Lateral */}
        <nav className="flex flex-row gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          <button className="flex items-center gap-3 whitespace-nowrap rounded-lg bg-surface-raised px-4 py-2.5 text-sm font-bold text-accent shadow-sm ring-1 ring-border">
            <Palette size={18} />
            Aparência
          </button>
          <button className="flex items-center gap-3 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-raised hover:text-text-primary transition-colors">
            <User size={18} />
            Perfil
          </button>
          <button className="flex items-center gap-3 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-raised hover:text-text-primary transition-colors">
            <Bell size={18} />
            Notificações
          </button>
          <button className="flex items-center gap-3 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-raised hover:text-text-primary transition-colors">
            <Shield size={18} />
            Segurança
          </button>
        </nav>

        {/* Conteúdo */}
        <div className="lg:col-span-3">
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
        </div>
      </div>
    </div>
  );
}
