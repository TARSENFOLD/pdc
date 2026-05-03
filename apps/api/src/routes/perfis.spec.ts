import { describe, expect, it } from 'vitest';
import { buildPerfilStrapiPayload } from './perfis.js';

describe('perfil routes payload mapping', () => {
  it('maps update payload fields to Strapi perfil attributes', () => {
    const payload = buildPerfilStrapiPayload({
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
      },
    });

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
      },
    });
  });

  it('keeps null avatarUrl so Strapi can remove the persisted R2 avatar', () => {
    expect(buildPerfilStrapiPayload({ avatarUrl: null })).toEqual({ avatarUrl: null });
  });
});
