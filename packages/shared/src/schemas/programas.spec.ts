import { describe, expect, it } from 'vitest';
import { CriarProgramaPayloadSchema } from './programas.js';

const CANONICAL_AREAS = [
  'SAUDE',
  'ENGENHARIA',
  'TECNOLOGIA',
  'DIREITO',
  'GESTAO',
  'EDUCACAO',
  'ARTES',
  'CIENCIAS_AGRARIAS',
  'CIENCIAS_SOCIAIS',
  'COMUNICACAO',
  'CIENCIAS_NATURAIS',
  'ARQUITETURA',
  'TURISMO_HOTELARIA',
  'DESPORTO',
  'OUTRA',
] as const;

const BASE_PAYLOAD = {
  titulo: 'Programa de Engenharia Aplicada',
  proposito: 'Reduzir a distância entre teoria e prática profissional.',
  metodologia: 'Combinar cursos, experiências e simulações orientadas.',
  tipo: 'standard',
} as const;

describe('CriarProgramaPayloadSchema', () => {
  it.each(CANONICAL_AREAS)('aceita a área vocacional canónica %s', (area) => {
    expect(CriarProgramaPayloadSchema.safeParse({ ...BASE_PAYLOAD, area }).success).toBe(true);
  });

  it('mantém exatamente as 15 áreas vocacionais canónicas', () => {
    const areaSchema = CriarProgramaPayloadSchema.shape.area;

    expect(areaSchema.options).toEqual(CANONICAL_AREAS);
  });

  it.each(['AGRONOMIA', 'OUTRO', 'informatica'])('rejeita a área não canónica %s', (area) => {
    expect(CriarProgramaPayloadSchema.safeParse({ ...BASE_PAYLOAD, area }).success).toBe(false);
  });

  it('aceita IDs dos conteúdos agrupados no contrato de criação', () => {
    const result = CriarProgramaPayloadSchema.parse({
      ...BASE_PAYLOAD,
      area: 'ENGENHARIA',
      cursosIds: ['curso-1', 'curso-2'],
      experienciasIds: ['experiencia-1'],
      simulacoesIds: ['simulacao-1'],
      projetosIds: ['projeto-1'],
    });

    expect(result.cursosIds).toEqual(['curso-1', 'curso-2']);
    expect(result.experienciasIds).toEqual(['experiencia-1']);
    expect(result.simulacoesIds).toEqual(['simulacao-1']);
    expect(result.projetosIds).toEqual(['projeto-1']);
  });

  it('valida recursos e política de preço estruturados', () => {
    const result = CriarProgramaPayloadSchema.parse({
      ...BASE_PAYLOAD,
      area: 'TECNOLOGIA',
      recursos: {
        materiais: ['Computadores'],
        infraestrutura: ['Laboratório'],
        equipa: ['Mentor técnico'],
      },
      precoPolicy: {
        modo: 'pago',
        valor: 25000,
        moeda: 'AOA',
        bolsasDisponiveis: true,
        descricaoBolsas: 'Bolsas para estudantes com mérito académico.',
      },
    });

    expect(result.recursos?.infraestrutura).toEqual(['Laboratório']);
    expect(result.precoPolicy?.valor).toBe(25000);
  });

  it('rejeita programa pago sem valor positivo', () => {
    const result = CriarProgramaPayloadSchema.safeParse({
      ...BASE_PAYLOAD,
      area: 'TECNOLOGIA',
      precoPolicy: {
        modo: 'pago',
        valor: 0,
        moeda: 'AOA',
        bolsasDisponiveis: false,
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejeita programa gratuito com valor diferente de zero', () => {
    const result = CriarProgramaPayloadSchema.safeParse({
      ...BASE_PAYLOAD,
      area: 'TECNOLOGIA',
      precoPolicy: {
        modo: 'gratuito',
        valor: 1000,
        moeda: 'AOA',
        bolsasDisponiveis: false,
      },
    });
    expect(result.success).toBe(false);
  });
});
