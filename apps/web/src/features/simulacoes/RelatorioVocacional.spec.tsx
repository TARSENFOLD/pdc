import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RelatorioVocacional } from './RelatorioVocacional';
import { MemoryRouter } from 'react-router-dom';
import { http } from '../../lib/api/http';

vi.mock('../../lib/api/http', () => ({
  http: {
    get: vi.fn(),
  },
}));

describe('RelatorioVocacional (R2.T6 Integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve mostrar estado "Reputação ainda não disponível" se API retornar 404', async () => {
    // Simular falha 404 no endpoint canónico (conforme Approach)
    vi.mocked(http.get).mockImplementation(async (url: string) => {
      if (url.includes('/reputacao/me')) {
        throw { status: 404, message: 'Not Found' };
      }
      return { patterns: [], recomendacoes: [] };
    });

    render(
      <MemoryRouter>
        <RelatorioVocacional />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Esperamos esta mensagem quando o gate está off
      expect(screen.queryByText(/Reputação ainda não disponível/i)).not.toBeNull();
    });
  });

  it('deve mostrar dados reais se API retornar 200 (Breakdown path)', async () => {
    vi.mocked(http.get).mockImplementation(async (url: string) => {
      if (url.includes('/reputacao/me')) {
        return {
          score: 85,
          tier: 'OURO',
          dimensions: {
            ratingsMedia: 4.5,
            cursosPublicados: 3,
            simulacoes: 10,
            conquistas: 5,
            tempoPlataforma: 12,
            engagement: 300,
          }
        };
      }
      // Outras chamadas (ex: behavior patterns)
      return { patterns: [], recomendacoes: [] };
    });

    render(
      <MemoryRouter>
        <RelatorioVocacional />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Verifica se o score 85 e tier OURO aparecem na UI
      expect(screen.getAllByText(/85/)).not.toHaveLength(0);
      expect(screen.queryByText(/OURO/i)).not.toBeNull();
    });
  });
});
