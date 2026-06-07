import { describe, expect, it } from 'vitest';
import { resolvePerfilAvatar, resolvePerfilBanner } from './perfil-media.js';

describe('profile media resolution', () => {
  it('prefers the current R2 avatar over the legacy Strapi relation', () => {
    expect(resolvePerfilAvatar(
      'https://media.usepdc.com/current-avatar.png',
      { url: 'https://legacy.example.com/avatar.png' },
    )).toBe('https://media.usepdc.com/current-avatar.png');
  });

  it('falls back to legacy media while old profiles are migrated', () => {
    expect(resolvePerfilAvatar(undefined, { url: 'https://legacy.example.com/avatar.png' }))
      .toBe('https://legacy.example.com/avatar.png');
    expect(resolvePerfilBanner(undefined, { url: 'https://legacy.example.com/banner.png' }))
      .toBe('https://legacy.example.com/banner.png');
  });
});
