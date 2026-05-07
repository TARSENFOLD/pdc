import { SEOHead } from '@/components/layout/SEOHead';
import LandingNavbar from '../features/landing/LandingNavbar';
import { LandingHero } from '../features/landing/LandingHero';
import LandingMarquee from '../features/landing/LandingMarquee';
import { CarrosselInstituicoes } from '../features/landing/CarrosselInstituicoes';
import { LandingProblema } from '../features/landing/LandingProblema';
import { LandingVisualDesk } from '../features/landing/LandingVisualDesk';
import { LandingComoFunciona } from '../features/landing/LandingComoFunciona';
import { LandingFeatures } from '../features/landing/LandingFeatures';
import { LandingMentores } from '../features/landing/LandingMentores';
import { LandingLivePulse } from '../features/landing/LandingLivePulse';
import { LandingCTAFinal } from '../features/landing/LandingCTAFinal';
import { LandingFooter } from '../features/landing/LandingFooter';

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-text-primary antialiased">
      <SEOHead
        title="PDC - Por Dentro do Curso"
        description="Experimenta profissões e cursos através de simulações práticas antes de te matriculares. Toma a decisão certa com base no teu próprio comportamento."
        url="https://usepdc.com"
      />
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingMarquee />
        <LandingProblema />
        <LandingVisualDesk />
        <LandingComoFunciona />
        <LandingFeatures />
        <LandingMentores />
        <LandingLivePulse />
        <LandingCTAFinal />
        <CarrosselInstituicoes />
      </main>
      <LandingFooter />
    </div>
  );
}
