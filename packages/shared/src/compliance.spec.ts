import { describe, expect, it } from 'vitest';
import {
  AceiteLegalSchema,
  DataNascimentoSchema,
  LEGAL_DOCUMENT_CURRENT_VERSIONS,
  LegalComplianceCompletionSchema,
  resolveEstadoMenoridade,
} from './compliance.js';
import { RegistoEstudantePayloadSchema } from './user.js';

const ACEITE_LEGAL = {
  termosUso: true,
  politicaPrivacidade: true,
  tratamentoDados: true,
  termosUsoVersao: LEGAL_DOCUMENT_CURRENT_VERSIONS.termosUso,
  politicaPrivacidadeVersao: LEGAL_DOCUMENT_CURRENT_VERSIONS.politicaPrivacidade,
  tratamentoDadosVersao: LEGAL_DOCUMENT_CURRENT_VERSIONS.tratamentoDados,
  aceiteEm: '2026-06-22T10:00:00.000Z',
} as const;

describe('compliance foundation', () => {
  it('valida datas de nascimento reais em formato canónico', () => {
    expect(DataNascimentoSchema.parse('2008-02-29')).toBe('2008-02-29');
    expect(() => DataNascimentoSchema.parse('2009-02-29')).toThrow();
    expect(() => DataNascimentoSchema.parse('29-02-2008')).toThrow();
  });

  it('classifica menoridade sem depender do fuso local', () => {
    const at = new Date('2026-06-22T12:00:00.000Z');
    expect(resolveEstadoMenoridade('2008-06-22', at)).toBe('adulto');
    expect(resolveEstadoMenoridade('2008-06-23', at)).toBe('menor');
    expect(resolveEstadoMenoridade(undefined, at)).toBe('pendente');
  });

  it('exige aceite explícito dos documentos legais obrigatórios', () => {
    const parsed = AceiteLegalSchema.parse({
      termosUso: true,
      politicaPrivacidade: true,
      tratamentoDados: true,
    });
    expect(parsed.termosUsoVersao).toMatch(/^termos-uso@/);
    expect(() => AceiteLegalSchema.parse({
      termosUso: true,
      politicaPrivacidade: true,
      tratamentoDados: false,
    })).toThrow();
  });

  it('bloqueia registo de estudante menor sem encarregado', () => {
    const base = {
      nome: 'Estudante Menor',
      email: 'menor@example.com',
      password: 'password-segura',
      areaInteresse: 'TECNOLOGIA',
      nivelEnsino: 'Secundário',
      dataNascimento: '2011-01-01',
      aceiteLegal: {
        termosUso: true,
        politicaPrivacidade: true,
        tratamentoDados: true,
      },
    };
    expect(() => RegistoEstudantePayloadSchema.parse(base)).toThrow();
    expect(RegistoEstudantePayloadSchema.parse({
      ...base,
      consentimentoEncarregado: {
        nome: 'Responsável Legal',
        email: 'responsavel@example.com',
        parentesco: 'tutor_legal',
        aceite: true,
      },
    }).consentimentoEncarregado?.parentesco).toBe('tutor_legal');
  });

  it('bloqueia regularização legal de menor sem encarregado', () => {
    expect(LegalComplianceCompletionSchema.parse({
      dataNascimento: '1990-01-01',
      aceiteLegal: ACEITE_LEGAL,
    }).dataNascimento).toBe('1990-01-01');
    expect(() => LegalComplianceCompletionSchema.parse({
      dataNascimento: '2014-01-01',
      aceiteLegal: ACEITE_LEGAL,
    })).toThrow();
  });
});
