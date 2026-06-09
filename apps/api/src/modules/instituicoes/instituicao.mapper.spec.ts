import { describe, expect, it } from 'vitest';
import { completude, mapPublica } from './instituicao.mapper.js';
import type { StrapiInstituicao } from './instituicao.types.js';

const instituicao: StrapiInstituicao = {
  id: 7,
  slug: 'instituto-pdc',
  nome: 'Instituto PDC',
  nomeLegal: 'Instituto PDC, Lda.',
  tipo: 'instituto',
  natureza: 'privada',
  nif: '5001234567',
  estado: 'verified',
  enderecoEstruturado: { pais: 'AO', provincia: 'Luanda', municipio: 'Talatona' },
  contactosInstitucionais: [
    { tipo: 'email', valor: 'publico@pdc.ao', publico: true },
    { tipo: 'telefone', valor: '+244900000000', publico: false },
  ],
  niveisEnsino: ['graduacao'],
  areasAtividade: ['Tecnologia'],
  infraestruturas: ['Laboratório'],
  acreditacoes: [{ nome: 'Acreditação', entidade: 'INAAREES', categoria: 'acreditacao' }],
  logoUrl: 'https://cdn.example/logo.png',
  documentosLegais: [{ nome: 'NIF.pdf', storageKey: 'private/nif.pdf' }],
};

describe('instituicao mapper', () => {
  it('remove NIF, documentos e contactos privados do serializer público', () => {
    const result = mapPublica(instituicao);
    expect(result).not.toHaveProperty('nif');
    expect(result).not.toHaveProperty('documentos');
    expect(JSON.stringify(result)).not.toContain('private/nif.pdf');
    expect(JSON.stringify(result)).not.toContain('+244900000000');
    expect(JSON.stringify(result)).toContain('publico@pdc.ao');
  });

  it('calcula completude a partir das secções persistidas', () => {
    expect(completude(instituicao)).toBe(100);
    expect(completude({ id: 1, nome: 'Rascunho' })).toBe(0);
  });
});
