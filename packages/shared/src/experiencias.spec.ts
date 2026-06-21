import { describe, expect, it } from 'vitest';
import { EmpregadorSchema, parsePainelRealidade } from './experiencias.js';

describe('EmpregadorSchema', () => {
  it('aceita empregador estruturado com dados opcionais', () => {
    const result = EmpregadorSchema.parse({
      nome: 'Sonangol',
      setor: 'Energia',
      logoUrl: 'https://cdn.usepdc.com/sonangol.png',
      url: 'https://www.sonangol.co.ao',
    });

    expect(result.nome).toBe('Sonangol');
    expect(result.setor).toBe('Energia');
  });

  it('converte strings legadas sem esconder objetos inválidos', () => {
    const legacy = parsePainelRealidade({
      principaisEmpregadores: ['Sonangol', 'BAI'],
    });

    expect(legacy.principaisEmpregadores).toEqual([
      { nome: 'Sonangol' },
      { nome: 'BAI' },
    ]);
    expect(() => parsePainelRealidade({
      principaisEmpregadores: [{ setor: 'Banca' }],
    })).toThrow();
  });
});
