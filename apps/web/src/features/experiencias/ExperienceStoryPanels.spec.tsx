import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Experiencia } from '@pdc/shared';
import { ExperienceStoryPanels } from './ExperienceStoryPanels';
import { ExperienceContent } from './ExperienceContent';

const EXPERIENCE = {
  id: 'exp-1',
  slug: 'engenharia',
  titulo: 'Por dentro da Engenharia',
  descricao: 'Experiência institucional.',
  gratuito: true,
  estado: 'published',
  validadoAcademicamente: true,
  createdAt: '2026-06-14T10:00:00.000Z',
  updatedAt: '2026-06-14T10:00:00.000Z',
  painelRealidade: {
    taxaEmpregabilidade: '82%',
    principaisEmpregadores: [
      {
        nome: 'Sonangol',
        setor: 'Energia',
        url: 'https://www.sonangol.co.ao',
      },
    ],
  },
  muralVozes: [
    {
      tipo: 'profissional',
      autor: 'Ana Manuel',
      cargo: 'Engenheira',
      depoimento: 'A formação abriu caminhos concretos.',
    },
  ],
  guiaInstitucional: {
    laboratorios: 'Laboratórios de automação e energia.',
    timelineCurricular: [{ ano: '1.º ano', foco: 'Bases científicas' }],
  },
} satisfies Experiencia;

describe('ExperienceStoryPanels', () => {
  it('não mostra painéis legados vazios ao lado de módulos preenchidos', () => {
    render(
      <>
        <ExperienceStoryPanels
          experience={{ ...EXPERIENCE, painelRealidade: {}, muralVozes: [], guiaInstitucional: {} }}
        />
        <ExperienceContent
          sections={[
            {
              id: 'welcome',
              tipo: 'boas_vindas',
              titulo: 'Conhece o percurso',
              ordem: 0,
              obrigatoria: true,
              visibilidade: 'publico',
              itens: [
                {
                  id: 'text',
                  tipo: 'texto',
                  titulo: 'Introdução',
                  ordem: 0,
                  conteudo: 'Conteúdo modular preenchido.',
                },
              ],
            },
          ]}
        />
      </>
    );
    expect(screen.getByText('Conteúdo modular preenchido.')).toBeTruthy();
    expect(screen.queryByText('Mural de vozes')).toBeNull();
    expect(screen.queryByText('Painel de realidade')).toBeNull();
  });
  it('renderiza os três painéis e o cartão de empregador', () => {
    render(<ExperienceStoryPanels experience={EXPERIENCE} />);

    expect(screen.getByText('Painel de realidade')).toBeTruthy();
    expect(screen.getByText('Ana Manuel')).toBeTruthy();
    expect(screen.getByText(/Bases científicas/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Sonangol/ }).getAttribute('href')).toBe(
      'https://www.sonangol.co.ao'
    );
    expect(screen.getByText('Energia')).toBeTruthy();
  });
});
