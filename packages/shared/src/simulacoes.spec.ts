import { describe, it, expect } from 'vitest';
import { CriarSimulacaoPayloadSchema } from './simulacoes.js';

describe('CriarSimulacaoPayloadSchema', () => {
  const basePayload = {
    titulo: 'Simulação de Teste',
    descricao: 'Uma descrição longa o suficiente para passar na validação.',
    area: 'TECNOLOGIA',
    tipo: 1,
    tipoLab: 'sandbox' as const,
  };

  it('deve validar quando a soma dos pesos é exatamente 100', () => {
    const payload = {
      ...basePayload,
      criteriosAvaliacao: {
        pesos: {
          fluidez: 30,
          resiliencia: 30,
          foco: 40,
        },
      },
    };
    const result = CriarSimulacaoPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('deve validar quando a soma dos pesos tem imprecisão de ponto flutuante (ex: 33.33 + 33.33 + 33.34)', () => {
    const payload = {
      ...basePayload,
      criteriosAvaliacao: {
        pesos: {
          fluidez: 33.33,
          resiliencia: 33.33,
          foco: 33.34,
        },
      },
    };
    // 33.33 + 33.33 + 33.34 = 100.00000000000001 em alguns ambientes JS
    const result = CriarSimulacaoPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('deve falhar quando a soma dos pesos não é 100', () => {
    const payload = {
      ...basePayload,
      criteriosAvaliacao: {
        pesos: {
          fluidez: 30,
          resiliencia: 30,
          foco: 30,
        },
      },
    };
    const result = CriarSimulacaoPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues[0];
      expect(issue).toBeDefined();
      expect(issue?.message).toBe('A soma dos pesos deve ser exatamente 100%');
    }
  });
});
