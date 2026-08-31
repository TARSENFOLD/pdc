import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LandingPage } from '../../pages/LandingPage';

vi.mock('@/components/layout/SEOHead', () => ({ SEOHead: () => null }));
vi.mock('./LandingNavbar', () => ({ default: () => <nav>Navigation</nav> }));
vi.mock('./LandingHero', () => ({ LandingHero: () => <section>Hero</section> }));
vi.mock('./LandingProblema', () => ({ LandingProblema: () => <section>Problema</section> }));
vi.mock('./LandingVisualDesk', () => ({ LandingVisualDesk: () => <section>Visual</section> }));
vi.mock('./LandingComoFunciona', () => ({ LandingComoFunciona: () => <section>Processo</section> }));
vi.mock('./LandingFeatures', () => ({ LandingFeatures: () => <section>Funcionalidades</section> }));
vi.mock('./LandingMentores', () => ({ LandingMentores: () => <section>Mentores</section> }));
vi.mock('./LandingCTAFinal', () => ({ LandingCTAFinal: () => <section>CTA</section> }));
vi.mock('./CarrosselInstituicoes', () => ({ CarrosselInstituicoes: () => <section>Instituições</section> }));
vi.mock('./LandingFooter', () => ({ LandingFooter: () => <footer>Footer</footer> }));

const webSourceRoot = resolve(process.cwd(), 'src');

describe('landing claims integrity', () => {
  it('does not render fabricated metrics or social activity', () => {
    render(<LandingPage />);

    expect(screen.queryByText(/Horas poupadas na decisão/i)).toBeNull();
    expect(screen.queryByText(/Vagas universitárias optimizadas/i)).toBeNull();
    expect(screen.queryByText(/Estudantes com rota definida/i)).toBeNull();
    expect(screen.queryByText(/competências em tempo real/i)).toBeNull();
  });

  it('does not retain the fabricated metric and activity modules', () => {
    const landingDirectory = resolve(webSourceRoot, 'features/landing');
    const removedModules = [
      'LandingMarquee.tsx',
      'LandingLivePulse.tsx',
      'livePulseData.ts',
    ];

    for (const moduleName of removedModules) {
      expect(() => readFileSync(resolve(landingDirectory, moduleName), 'utf8')).toThrow();
    }
  });
});
