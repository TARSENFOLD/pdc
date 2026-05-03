import { describe, expect, it } from 'vitest';
import { buildPerfilStrapiPayload, type PerfilStrapiPayload } from './perfis.js';
import type { UpdatePerfilPayload } from '@pdc/shared';

describe('perfil routes payload mapping', () => {
  it('maps update payload fields to Strapi perfil attributes', () => {
    const input: UpdatePerfilPayload = {
      bio: 'Bio com menos de mil caracteres.',
      avatarUrl: 'https://cdn.pdc.test/avatar.jpg',
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
    };
    const payload: PerfilStrapiPayload = buildPerfilStrapiPayload(input);

    expect(payload).toEqual({
      bio: 'Bio com menos de mil caracteres.',
      avatarUrl: 'https://cdn.pdc.test/avatar.jpg',
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
  });

  it('keeps null avatarUrl so Strapi can remove the persisted R2 avatar', () => {
    const input: UpdatePerfilPayload = { avatarUrl: null };
    expect(buildPerfilStrapiPayload(input)).toEqual({ avatarUrl: null });
  });
});
