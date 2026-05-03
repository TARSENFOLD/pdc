import { describe, expect, it } from 'vitest';
import { UpdatePerfilPayloadSchema, PerfilCompletoSchema } from './user.js';

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
