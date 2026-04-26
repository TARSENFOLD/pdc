/**
 * Tipo2Player Characterization Suite
 *
 * Esta suite serve de gate para Phase 11 (T18).
 * Nenhum ticket de players pode arrancar com ela vermelha.
 *
 * Espelha a estrutura canónica de Tipo3Player.spec.tsx.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Tipo2Player } from './Tipo2Player';
import { MemoryRouter } from 'react-router-dom';
import { useTelemetry } from '@/hooks/useTelemetry';
import { simulacoesApi } from '../../lib/api/simulacoes';

vi.mock('@/hooks/useTelemetry', () => ({
  useTelemetry: vi.fn(),
}));

vi.mock('../../lib/api/simulacoes', () => ({
  simulacoesApi: {
    concluirTentativa: vi.fn().mockResolvedValue({}),
  },
}));

// Mock navigate to avoid jsdom issues
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('Tipo2Player (Characterization)', () => {
  const mockTrack = vi.fn();
  const mockFlush = vi.fn();
  const mockSimulacao = {
    id: 'sim-2',
    titulo: 'Simulação Tipo 2',
    descricao: 'Teste de Fidelidade Média',
    area: 'GESTAO' as const,
    tipo: 2 as const,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTelemetry).mockReturnValue({
      track: mockTrack,
      flush: mockFlush,
    } as any);
  });

  it('deve renderizar o shell operacional', () => {
    render(
      <MemoryRouter initialEntries={['/play?tentativaId=tent-2']}>
        <Tipo2Player simulacao={mockSimulacao} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Tempo de Missão/i)).not.toBeNull();
    expect(screen.getByText(/Estabilidade de Foco/i)).not.toBeNull();
    // O botão de conclusão deve estar presente
    expect(screen.getByTestId('concluir-missao-btn')).not.toBeNull();
  });

  it('deve emitir o evento canónico simulacao.tipo2.iniciada no mount', () => {
    render(
      <MemoryRouter initialEntries={['/play?tentativaId=tent-2']}>
        <Tipo2Player simulacao={mockSimulacao} />
      </MemoryRouter>
    );

    expect(mockTrack).toHaveBeenCalledWith('simulacao.tipo2.iniciada', expect.objectContaining({
      simulacaoId: 'sim-2',
      tentativaId: 'tent-2',
    }));
  });

  it('deve emitir simulacao.foco.perdido quando visibilidade muda para hidden', () => {
    render(
      <MemoryRouter initialEntries={['/play?tentativaId=tent-2']}>
        <Tipo2Player simulacao={mockSimulacao} />
      </MemoryRouter>
    );

    // Simular perda de foco
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(mockTrack).toHaveBeenCalledWith('simulacao.foco.perdido', expect.objectContaining({
      timestamp: expect.any(Number),
    }));
  });

  it('deve emitir simulacao.tipo2.concluida e chamar concluirTentativa ao finalizar', async () => {
    render(
      <MemoryRouter initialEntries={['/play?tentativaId=tent-2']}>
        <Tipo2Player simulacao={mockSimulacao} />
      </MemoryRouter>
    );

    const btnFinalizar = screen.getByTestId('concluir-missao-btn');
    fireEvent.click(btnFinalizar);

    await waitFor(() => {
      expect(mockTrack).toHaveBeenCalledWith('simulacao.tipo2.concluida', expect.objectContaining({
        tentativaId: 'tent-2',
      }));
      expect(simulacoesApi.concluirTentativa).toHaveBeenCalledWith(expect.objectContaining({
        tentativaId: 'tent-2',
        metadata: expect.objectContaining({
          tipo: 2,
        }),
      }));
    });
  });

  it('deve chamar flush no cleanup (unmount)', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/play?tentativaId=tent-2']}>
        <Tipo2Player simulacao={mockSimulacao} />
      </MemoryRouter>
    );

    unmount();
    expect(mockFlush).toHaveBeenCalled();
  });
});
