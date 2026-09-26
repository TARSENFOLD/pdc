import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { ExperienciaSchema } from '@pdc/shared';
import { experienciasApi } from '@/lib/api/experiencias';
import { VwxParticipation } from './VwxParticipation';

vi.mock('@/lib/api/experiencias', () => ({ experienciasApi: { progresso: vi.fn() } }));
const experience = ExperienciaSchema.parse({
  id: 'vwx-1',
  slug: 'vwx-teste',
  titulo: 'VWX teste',
  descricao: 'Percurso profissional.',
  tipoExperiencia: 'vwx',
  createdAt: '2026-09-26',
  updatedAt: '2026-09-26',
  secoes: [
    {
      id: 'contexto',
      tipo: 'contexto',
      titulo: 'Contexto',
      ordem: 0,
      obrigatoria: true,
      visibilidade: 'publico',
      itens: [],
    },
  ],
});

describe('VWX — participação', () => {
  it('não reenvia etapas removidas da versão atual', async () => {
    const participation = {
      id: 'p1',
      secoesConcluidas: ['contexto', 'etapa-removida'],
      entrega: 'Trabalho',
      reflexao: '',
    };
    vi.mocked(experienciasApi.progresso).mockResolvedValue({
      ...participation,
      secoesConcluidas: ['contexto'],
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <VwxParticipation experience={experience} participation={participation} />
      </QueryClientProvider>
    );
    expect(screen.getByText('1 etapa assinalada. Guarda para retomar mais tarde.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar progresso' }));
    await waitFor(() =>
      expect(experienciasApi.progresso).toHaveBeenCalledWith('vwx-1', {
        secoesConcluidas: ['contexto'],
        entrega: 'Trabalho',
        reflexao: '',
        concluir: false,
      })
    );
  });
});
