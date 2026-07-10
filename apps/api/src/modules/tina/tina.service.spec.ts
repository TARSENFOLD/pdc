import { describe, expect, it } from 'vitest';
import { extractJsonObject } from './tina.service.js';

describe('extractJsonObject', () => {
  it('extrai JSON mesmo quando a IA devolve markdown', () => {
    const parsed = extractJsonObject('```json\n{"area":"Tecnologia","score":82}\n```');

    expect(parsed).toEqual({ area: 'Tecnologia', score: 82 });
  });

  it('devolve null quando não há objeto JSON', () => {
    expect(extractJsonObject('sem json aqui')).toBeNull();
  });

  it('propaga erro de JSON inválido para o chamador decidir fallback', () => {
    expect(() => extractJsonObject('{"area":}')).toThrow();
  });

  it('ignora JSON que não contenha um objeto literal', () => {
    expect(extractJsonObject('["não", "objeto"]')).toBeNull();
  });
});