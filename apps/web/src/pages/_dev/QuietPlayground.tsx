import { Inbox, Zap, Star, Trophy, UserCheck } from 'lucide-react';
import { QuietCard } from '@/components/ui/quiet/QuietCard';
import QuietButton from '@/components/ui/quiet/QuietButton';
import { QuietHero } from '@/components/ui/quiet/QuietHero';
import { QuietStat } from '@/components/ui/quiet/QuietStat';
import { QuietBadge } from '@/components/ui/quiet/QuietBadge';
import { QuietEmpty } from '@/components/ui/quiet/QuietEmpty';
import { QuietSection } from '@/components/ui/quiet/QuietSection';
import { Carousel } from '@/components/ui/quiet/Carousel';
import WelcomeMat from '@/components/ui/quiet/WelcomeMat';
import { HUDPanel } from '@/components/ui/HUDPanel';
import { RoleDashboardShell } from '@/components/ui/shells/RoleDashboardShell';

export function QuietPlayground() {
  return (
    <div className="p-8 space-y-16 max-w-5xl mx-auto">
      <QuietHero
        kicker="Design System"
        title="Quiet Primitives Playground"
        description="Ambiente de teste para os primitivos calmos Soul & Elite. Validação de variants, dark mode e a11y."
      />

      <QuietSection title="QuietStat">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <QuietStat label="XP Total" value={12450} icon={Zap} />
          <QuietStat label="Reputação" value="94/100" icon={Star} />
          <QuietStat label="Conquistas" value={37} icon={Trophy} />
          <QuietStat label="Vínculos" value={5} icon={UserCheck} href="/vinculos" />
        </div>
      </QuietSection>

      <QuietSection title="QuietBadge">
        <div className="flex flex-wrap gap-2">
          <QuietBadge variant="default">Neutral</QuietBadge>
          <QuietBadge variant="success">Positivo</QuietBadge>
          <QuietBadge variant="warning">Aviso</QuietBadge>
          <QuietBadge variant="error">Erro</QuietBadge>
          <QuietBadge variant="info">Info</QuietBadge>
          <QuietBadge variant="accent">Autoridade</QuietBadge>
        </div>
      </QuietSection>

      <QuietSection title="QuietEmpty">
        <QuietCard>
          <QuietEmpty
            icon={Inbox}
            message="Ainda não tens cursos em progresso."
            description="Explora o catálogo para começares a tua jornada."
            action={{ label: 'Explorar cursos', to: '/catalogo/cursos' }}
          />
        </QuietCard>
      </QuietSection>

      <QuietSection title="Carousel">
        <Carousel
          ariaLabel="Cursos recentes"
          items={['Simulação 1', 'Simulação 2', 'Simulação 3']}
          renderItem={(item) => (
            <QuietCard key={item} padding="sm" className="min-w-[200px]">
              <p className="text-sm font-medium text-ink-primary">{item}</p>
            </QuietCard>
          )}
        />
      </QuietSection>

      <QuietSection title="WelcomeMat">
        <WelcomeMat
          title="Bem-vindo ao PDC"
          description="O teu espaço de desenvolvimento profissional."
          dismissable
          storageKey="playground"
          actions={<QuietButton variant="primary">Explorar →</QuietButton>}
        />
      </QuietSection>

      <QuietSection title="HUDPanel">
        <div className="h-64 bg-surface-canvas-dark rounded-3xl overflow-hidden border border-white/10 flex">
          <div className="flex-1 p-8 text-white/20 font-mono text-xs">
            Simulation Area
          </div>
          <HUDPanel 
            phi={0.85}
            resilience={0.92}
            timer="04:20"
            hesitation={0.12}
          />
        </div>
      </QuietSection>

      <QuietSection title="RoleDashboardShell">
        <div className="border border-white/5 rounded-3xl overflow-hidden scale-90 origin-top">
          <RoleDashboardShell
            hero={<QuietHero title="Olá, Talento." kicker="Dashboard" />}
            kpiStrip={[
              <QuietStat key="1" label="XP" value={100} icon={Zap} />,
              <QuietStat key="2" label="Rep" value={50} icon={Star} />,
            ]}
            primary={<QuietCard>Content</QuietCard>}
            side={<QuietCard>Side</QuietCard>}
          />
        </div>
      </QuietSection>
    </div>
  );
}
