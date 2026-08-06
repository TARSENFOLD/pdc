import { describe, expect, it } from 'vitest';
import { InstituicaoStatsSchema } from './dashboard.js';

describe('COR-0003 institution report contract', () => {
  it('preserva null como ausência de dados e zero como contagem real', () => {
    expect(InstituicaoStatsSchema.parse({
      conteudosTotais: null,
      inscricoesTotais: 0,
      participacoesTotais: null,
    })).toEqual({
      conteudosTotais: null,
      inscricoesTotais: 0,
      participacoesTotais: null,
    });
  });

  it('recusa percentagens e totais negativos fora do contrato', () => {
    expect(InstituicaoStatsSchema.safeParse({
      conteudosTotais: -1,
      inscricoesTotais: 1.5,
      participacoesTotais: 0,
    }).success).toBe(false);
  });
});
