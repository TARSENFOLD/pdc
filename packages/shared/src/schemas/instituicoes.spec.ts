import { describe, expect, it } from 'vitest';
import {
  EnderecoAngolaSchema,
  IdentidadeInstituicaoSchema,
  ProvinciasAngolaSchema,
} from './instituicoes-base.js';
import { InstituicaoPublicaDetalhadaSchema } from './instituicoes.js';

describe('contratos institucionais Angola-first', () => {
  it('mantém as 21 províncias vigentes', () => {
    expect(ProvinciasAngolaSchema.options).toHaveLength(21);
    expect(ProvinciasAngolaSchema.options).toContain('Icolo e Bengo');
    expect(ProvinciasAngolaSchema.options).not.toContain('Cuando Cubango');
  });

  it('não exige código postal no endereço angolano', () => {
    const result = EnderecoAngolaSchema.parse({
      provincia: 'Luanda',
      municipio: 'Talatona',
    });
    expect(result.pais).toBe('AO');
    expect(result).not.toHaveProperty('codigoPostal');
  });

  it('aceita validação básica de NIF sem inventar checksum', () => {
    const result = IdentidadeInstituicaoSchema.parse({
      nome: 'Instituto PDC',
      nomeLegal: 'Instituto PDC, Lda.',
      tipo: 'instituto',
      natureza: 'privada',
      nif: '5001234567',
    });
    expect(result.nif).toBe('5001234567');
  });

  it('rejeita campos privados no contrato público', () => {
    const result = InstituicaoPublicaDetalhadaSchema.safeParse({
      id: '1',
      slug: 'instituto-pdc',
      estado: 'verified',
      verificada: true,
      completude: 100,
      nome: 'Instituto PDC',
      tipo: 'instituto',
      natureza: 'privada',
      selos: ['verificada'],
      nif: '5001234567',
    });
    expect(result.success).toBe(false);
  });
});
