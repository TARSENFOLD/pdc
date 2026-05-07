import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Tipo3Player } from './Tipo3Player';
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

describe('Tipo3Player (R2.T5)', () => {
  const mockTrack = vi.fn();
  const mockFlush = vi.fn();
  const mockSimulacao = {
    id: 'sim-3',
    slug: 'sim-3-slug',
    titulo: 'Simulação Tipo 3',
    descricao: 'Teste Imersivo',
    area: 'TECNOLOGIA' as const,
    tipo: 3 as const,
    tipoSimulacao: 'tipo3' as const,
    autorId: 'author-123',
    estado: 'published' as const,
    validadoAcademicamente: true,
    criteriosAvaliacao: { pesos: { fluidez: 40, resiliencia: 30, foco: 30 } },
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const telemetryMock: ReturnType<typeof useTelemetry> = {
      track: (tipo, payload) => {
        mockTrack(tipo, payload);
      },
      flush: () => {
        mockFlush();
        return Promise.resolve();
      },
    };
    vi.mocked(useTelemetry).mockReturnValue(telemetryMock);
  });

  it('deve renderizar o shell funcional', () => {
    render(
      <MemoryRouter initialEntries={['/play?tentativaId=tent-3']}>
        <Tipo3Player simulacao={mockSimulacao} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Simulação Tipo 3/i)).not.toBeNull();
    expect(screen.getByText(/Tempo Decorrido/i)).not.toBeNull();
  });

  it('deve emitir os 3 eventos canónicos no ciclo de vida', async () => {
    render(
      <MemoryRouter initialEntries={['/play?tentativaId=tent-3']}>
        <Tipo3Player simulacao={mockSimulacao} />
      </MemoryRouter>
    );

    // 1. Iniciada (emitido no mount)
    expect(mockTrack).toHaveBeenCalledWith('simulacao.tipo3.iniciada', expect.objectContaining({
      simulacaoId: 'sim-3',
      tentativaId: 'tent-3'
    }));

    // 2. Ação
    const btnAnalise = screen.getByText(/Executar Análise/i);
    fireEvent.click(btnAnalise);
    expect(mockTrack).toHaveBeenCalledWith('simulacao.tipo3.acao', expect.objectContaining({
      tipo: 'analise'
    }));

    // 3. Concluída
    const btnConcluir = screen.getByText(/Concluir Simulação/i);
    fireEvent.click(btnConcluir);

    await waitFor(() => {
      expect(mockTrack).toHaveBeenCalledWith('simulacao.tipo3.concluida', expect.objectContaining({
        tentativaId: 'tent-3'
      }));
      const payload = vi.mocked(simulacoesApi.concluirTentativa).mock.calls[0]?.[0];
      expect(payload?.tentativaId).toBe('tent-3');
      expect(payload?.metadata).toMatchObject({ tipo: 3, acoesCount: 1 });
    });
  });
});
