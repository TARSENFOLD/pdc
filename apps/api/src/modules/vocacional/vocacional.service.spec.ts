import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { vocacionalService } from './vocacional.service.js';
import { strapiGet } from '../strapi/strapi.client.js';
import { personas } from './__fixtures__/personas.js';

// Mock do strapiGet
vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
}));

const strapiGetMock = vi.mocked(strapiGet);

const mockMeta = {
  pagination: { page: 1, pageSize: 10, pageCount: 1, total: 1 }
};

describe('vocacionalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T08:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Básicos', () => {
    it('deve retornar perfil zerado quando não há tentativas', async () => {
      strapiGetMock.mockResolvedValue({ 
        data: [], 
        meta: { pagination: { page: 1, pageSize: 10, pageCount: 0, total: 0 } } 
      });

      const perfil = await vocacionalService.calcularPerfil('aluno-1');

      expect(perfil.aptidao).toBe(0);
      expect(perfil.scoreGlobal).toBe(0);
      expect(perfil.alunoId).toBe('aluno-1');
    });

    it('deve calcular corretamente com uma única tentativa', async () => {
      strapiGetMock.mockResolvedValue({
        data: [
          {
            id: 1,
            alunoId: 'aluno-1',
            simulacaoId: 'sim-1',
            score: 8,
            dataFim: '2026-04-15T12:00:00Z'
          }
        ],
        meta: mockMeta
      });

      const perfil = await vocacionalService.calcularPerfil('aluno-1');

      expect(perfil.aptidao).toBe(8);
      expect(perfil.consistencia).toBe(10);
      expect(perfil.dedicacao).toBe(2);
      expect(perfil.diversidade).toBe(3.3);
      expect(perfil.scoreGlobal).toBe(6.3);
    });
  });

  describe('Personas Arquétipo (Characterization Tests)', () => {
    personas.forEach((persona) => {
      it(`deve calcular o perfil corretamente para: ${persona.nome} (${persona.arquétipo})`, async () => {
        strapiGetMock.mockResolvedValue({
          data: persona.tentativas.map((t, idx) => ({
            id: idx + 1,
            alunoId: persona.alunoId,
            simulacaoId: t.simulacaoId,
            score: t.score,
            dataFim: t.dataFim || new Date().toISOString()
          })),
          meta: {
            pagination: { 
              page: 1, 
              pageSize: 100, 
              pageCount: 1, 
              total: persona.tentativas.length 
            }
          }
        });

        const perfil = await vocacionalService.calcularPerfil(persona.alunoId);

        // Snapshot para garantir que o estado actual do algoritmo é preservado
        expect(perfil).toMatchSnapshot();

        // Validações explícitas básicas para garantir sanidade
        expect(perfil.alunoId).toBe(persona.alunoId);
        expect(perfil.scoreGlobal).toBeGreaterThanOrEqual(0);
        expect(perfil.scoreGlobal).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('Recomendações', () => {
    it('deve gerar recomendações baseadas no perfil', async () => {
      const mockCursos = [
        { id: '1', titulo: 'Engenharia de Software' },
        { id: '2', titulo: 'Medicina' },
        { id: '3', titulo: 'Gestão de Empresas' },
      ];
      strapiGetMock.mockResolvedValue({ 
        data: mockCursos, 
        meta: { pagination: { page: 1, pageSize: 3, pageCount: 1, total: 3 } } 
      });

      const perfil = {
        alunoId: 'aluno-1',
        aptidao: 8,
        consistencia: 10,
        dedicacao: 10,
        diversidade: 10,
        scoreGlobal: 9,
        updatedAt: new Date().toISOString(),
      };

      const recomendacoes = await vocacionalService.gerarRecomendacoes(perfil);

      expect(recomendacoes).toHaveLength(3);
      expect(recomendacoes[0]!.matchPercentagem).toBeGreaterThan(70);
      expect(recomendacoes[0]!.motivo).toContain('9');
    });
  });
});
