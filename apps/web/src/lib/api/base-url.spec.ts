import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from './base-url';

describe('resolveApiBaseUrl', () => {
  it('normaliza espaços e barras finais da configuração', () => {
    expect(resolveApiBaseUrl('  https://api.example.com///  ', true))
      .toBe('https://api.example.com');
  });

  it('ignora uma configuração vazia ou composta por espaços', () => {
    expect(resolveApiBaseUrl('   ', true)).toBe('https://api.usepdc.com');
    expect(resolveApiBaseUrl('', false)).toBe('/api');
  });
});
