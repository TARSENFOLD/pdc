import { describe, expect, it } from 'vitest';
import { isPublicAuthPath } from './public-auth-path.js';

describe('isPublicAuthPath', () => {
  it('aceita o conjunto base de rotas públicas de auth', () => {
    expect(isPublicAuthPath('/login')).toBe(true);
    expect(isPublicAuthPath('/criar-conta')).toBe(true);
    expect(isPublicAuthPath('/criar-conta/finalizar')).toBe(true);
    expect(isPublicAuthPath('/forgot-password')).toBe(true);
  });

  it('aceita rotas aninhadas e ignora trailing slash', () => {
    expect(isPublicAuthPath('/criar-conta/estudante')).toBe(true);
    expect(isPublicAuthPath('/criar-conta/estudante/')).toBe(true);
    expect(isPublicAuthPath('/login/')).toBe(true);
  });

  it('rejeita rotas privadas', () => {
    expect(isPublicAuthPath('/app')).toBe(false);
    expect(isPublicAuthPath('/auth/me')).toBe(false);
  });
});
