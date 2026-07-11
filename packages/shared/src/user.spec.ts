import { describe, expect, it } from 'vitest';
import {
  LegacyRoleSchema,
  normalizeTipo,
  PerfilCompletoSchema,
  RegistoInstituicaoPayloadSchema,
  UpdatePerfilPayloadSchema,
} from './user.js';

describe('perfil contracts', () => {
  it('uses visibilitySettings as the canonical privacy payload key', () => {
    const result = UpdatePerfilPayloadSchema.parse({
      visibilitySettings: {
        email: 'privado',
        telefone: 'privado',
        miniFeed: 'publico',
        vinculos: 'publico',
        bio: 'publico',
        socialLinks: 'conexoes',
        areasInteresse: 'publico',
        competencias: 'publico',
        historicoProfissional: 'conexoes',
        formacaoAcademica: 'conexoes',
      },
    });

    expect(result.visibilitySettings?.email).toBe('privado');
    expect('visibility' in result).toBe(false);
  });

  it('matches the Strapi bio limit and accepts nullable avatarUrl removal', () => {
    const bio = 'a'.repeat(1000);
    const result = UpdatePerfilPayloadSchema.parse({ bio, avatarUrl: null });

    expect(result.bio).toHaveLength(1000);
    expect(result.avatarUrl).toBeNull();
  });

  it('rejects bio exceeding Strapi limit', () => {
    const bio = 'a'.repeat(1001);
    expect(() => UpdatePerfilPayloadSchema.parse({ bio })).toThrow();
  });

  it('rejects invalid visibility value', () => {
    expect(() => UpdatePerfilPayloadSchema.parse({
      visibilitySettings: { email: 'everyone' },
    })).toThrow();
  });

  it('rejects non-URL avatarUrl', () => {
    expect(() => UpdatePerfilPayloadSchema.parse({ avatarUrl: 'not-a-url' })).toThrow();
  });

  it('rejects PerfilCompleto with invalid role', () => {
    expect(() => PerfilCompletoSchema.parse({
      id: 'p1', email: 'a@b.com', nome: 'A', role: 'superuser',
      avatarUrl: null, reputacaoTier: 'BRONZE', xp: 0, reputacao: 0,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
      areasInteresse: [], conquistas: [], socialLinks: [],
    })).toThrow();
  });

  it('rejects PerfilCompleto with invalid email', () => {
    expect(() => PerfilCompletoSchema.parse({
      id: 'p1', email: 'not-an-email', nome: 'A', role: 'estudante',
      avatarUrl: null, reputacaoTier: 'BRONZE', xp: 0, reputacao: 0,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
      areasInteresse: [], conquistas: [], socialLinks: [],
    })).toThrow();
  });

  it('returns private profile settings using the persisted key', () => {
    const result = PerfilCompletoSchema.parse({
      id: 'perfil-1',
      email: 'aluno@traycer.test',
      nome: 'Aluno Teste',
      role: 'estudante',
      avatarUrl: null,
      reputacaoTier: 'BRONZE',
      xp: 0,
      reputacao: 0,
      createdAt: '2026-04-30T00:00:00.000Z',
      updatedAt: '2026-04-30T00:00:00.000Z',
      areasInteresse: [],
      conquistas: [],
      socialLinks: [],
      visibilitySettings: {
        email: 'privado',
        telefone: 'privado',
        miniFeed: 'publico',
        vinculos: 'publico',
        bio: 'publico',
        socialLinks: 'conexoes',
        areasInteresse: 'publico',
        competencias: 'publico',
        historicoProfissional: 'conexoes',
        formacaoAcademica: 'conexoes',
      },
    });

    expect(result.visibilitySettings?.bio).toBe('publico');
  });
});

describe('role normalization (legacy → canonical)', () => {
  it('normalizes legacy aluno to estudante', () => {
    expect(normalizeTipo('aluno')).toBe('estudante');
  });

  it('normalizes legacy admin to super_admin', () => {
    expect(normalizeTipo('admin')).toBe('super_admin');
  });

  it('keeps canonical roles unchanged', () => {
    expect(normalizeTipo('estudante')).toBe('estudante');
    expect(normalizeTipo('mentor')).toBe('mentor');
    expect(normalizeTipo('super_admin')).toBe('super_admin');
  });

  it('falls back to estudante for unknown roles', () => {
    expect(normalizeTipo('superuser')).toBe('estudante');
  });

  it('coerces legacy roles via LegacyRoleSchema', () => {
    expect(LegacyRoleSchema.parse('aluno')).toBe('estudante');
    expect(LegacyRoleSchema.parse('admin')).toBe('super_admin');
  });

  it('accepts all canonical roles via LegacyRoleSchema', () => {
    const roles = ['estudante', 'mentor', 'instituicao', 'comite_cientifico', 'moderador', 'super_admin', 'patrocinador'] as const;
    for (const role of roles) {
      expect(LegacyRoleSchema.parse(role)).toBe(role);
    }
  });
});

describe('registo institucional', () => {
  const base = {
    nome: 'Gestor Institucional',
    nomeInstituicao: 'Instituto PDC',
    email: 'gestor@pdc.ao',
    password: 'SenhaTeste123',
    tipo: 'instituto',
    nif: '5001234567',
    aceiteLegal: {
      termosUso: true,
      politicaPrivacidade: true,
      tratamentoDados: true,
      termosUsoVersao: '2026-06-01',
      politicaPrivacidadeVersao: '2026-06-01',
      tratamentoDadosVersao: '2026-06-01',
      aceiteEm: '2026-06-22T10:00:00.000Z',
    },
  } as const;

  it('exige identidade organizacional canónica', () => {
    const result = RegistoInstituicaoPayloadSchema.parse(base);
    expect(result.nomeInstituicao).toBe('Instituto PDC');
    expect(result.tipo).toBe('instituto');
    expect(result.nif).toBe('5001234567');
  });

  it('rejeita tipo institucional fora do enum canónico', () => {
    expect(() => RegistoInstituicaoPayloadSchema.parse({
      ...base,
      tipo: 'escola_tecnica',
    })).toThrow();
  });

  it('não aceita documentos falsos no payload de registo', () => {
    const result = RegistoInstituicaoPayloadSchema.safeParse({
      ...base,
      documentos: ['nif.pdf'],
    });
    expect(result.success).toBe(false);
  });
});
