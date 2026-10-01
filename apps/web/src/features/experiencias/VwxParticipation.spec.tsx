import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { ExperienciaSchema } from '@pdc/shared';
import { experienciasApi } from '@/lib/api/experiencias';
import { VwxParticipation } from './VwxParticipation';
import { ApiError } from '@/lib/api/http';

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
  it('mostra o motivo da falha e permite guardar novamente sem perder o trabalho', async () => {
    const participation = {
      id: 'p1',
      secoesConcluidas: ['contexto'],
      entrega: 'Trabalho privado',
      reflexao: 'Reflexão',
    };
    vi.mocked(experienciasApi.progresso).mockRejectedValueOnce(
      new ApiError(503, 'Falha', { error: 'Serviço temporariamente indisponível.' })
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <VwxParticipation experience={experience} participation={participation} />
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Guardar progresso' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Serviço temporariamente indisponível.'
    );
    expect(screen.getByLabelText('O teu entregável')).toHaveValue('Trabalho privado');
    vi.mocked(experienciasApi.progresso).mockResolvedValueOnce(participation);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar progresso' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Progresso guardado.');
  });

  it('conclui com o payload próprio e bloqueia novas alterações', async () => {
    const participation = {
      id: 'p1',
      secoesConcluidas: ['contexto'],
      entrega: 'Trabalho',
      reflexao: 'Aprendizagem',
    };
    vi.mocked(experienciasApi.progresso).mockResolvedValueOnce({
      ...participation,
      concluidoEm: '2026-10-01T12:00:00.000Z',
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <VwxParticipation experience={experience} participation={participation} />
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Concluir VWX' }));
    expect(await screen.findByRole('heading', { name: 'VWX concluída' })).toBeTruthy();
    expect(experienciasApi.progresso).toHaveBeenLastCalledWith('vwx-1', {
      secoesConcluidas: ['contexto'],
      entrega: 'Trabalho',
      reflexao: 'Aprendizagem',
      concluir: true,
    });
    expect(screen.getByLabelText('O teu entregável')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Concluir VWX' })).toBeNull();
  });
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
