import { describe, expect, it } from 'vitest';
import { ExperienciasFilaResponseSchema } from './experiencias.js';

describe('ExperienciasFilaResponseSchema', () => {
  const pagination = { page: 1, pageSize: 10, total: 1, pageCount: 1 };
  const data = [{ id: 3, titulo: 'Experiência', autorNome: 'Mentor', submittedAt: '2026-10-01', tipo: 'experiencia' }];
  it.each(['meta', 'pagination'])('valida e normaliza o envelope %s', (key) => {
    expect(ExperienciasFilaResponseSchema.parse({ data, [key]: pagination })).toEqual({ data: [{ ...data[0], id: '3' }], pagination });
  });
  it('não mascara itens nem paginação inválidos', () => {
    expect(ExperienciasFilaResponseSchema.safeParse({ data: [{ id: 3 }], meta: pagination }).success).toBe(false);
    expect(ExperienciasFilaResponseSchema.safeParse({ data }).success).toBe(false);
  });
});
