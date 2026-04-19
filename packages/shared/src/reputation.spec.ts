import { describe, it, expect } from 'vitest';
import { ReputacaoBreakdownSchema } from './reputation.js';

describe('ReputacaoBreakdownSchema Contract', () => {
  it('deve validar um payload completo e correto', () => {
    const validData = {
      score: 85.5,
      tier: 'OURO',
      dimensions: {
        ratingsMedia: 4.8,
        cursosPublicados: 5,
        simulacoes: 12,
        conquistas: 8,
        tempoPlataforma: 120.5,
        engagement: 450
      }
    };
    
    const result = ReputacaoBreakdownSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('deve falhar se o tier for inválido', () => {
    const invalidData = {
      score: 50,
      tier: 'PLATINA', // Não existe no enum
      dimensions: {
        ratingsMedia: 0,
        cursosPublicados: 0,
        simulacoes: 0,
        conquistas: 0,
        tempoPlataforma: 0,
        engagement: 0
      }
    };
    
    const result = ReputacaoBreakdownSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('deve falhar se faltarem dimensões obrigatórias', () => {
    const missingData = {
      score: 50,
      tier: 'BRONZE',
      dimensions: {
        ratingsMedia: 4.0
        // Faltam os outros
      }
    };
    
    const result = ReputacaoBreakdownSchema.safeParse(missingData);
    expect(result.success).toBe(false);
  });

  it('deve garantir que o score está entre 0 e 100', () => {
    const base = {
      tier: 'BRONZE',
      dimensions: {
        ratingsMedia: 0,
        cursosPublicados: 0,
        simulacoes: 0,
        conquistas: 0,
        tempoPlataforma: 0,
        engagement: 0
      }
    };

    expect(ReputacaoBreakdownSchema.safeParse({ ...base, score: -1 }).success).toBe(false);
    expect(ReputacaoBreakdownSchema.safeParse({ ...base, score: 101 }).success).toBe(false);
    expect(ReputacaoBreakdownSchema.safeParse({ ...base, score: 100 }).success).toBe(true);
  });
});
