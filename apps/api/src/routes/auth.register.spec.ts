import { describe, expect, it, vi } from 'vitest';

vi.mock('../middleware/rateLimit.js', () => ({
  rateLimitRegisto: vi.fn(async (_context: unknown, next: () => Promise<void>) => {
    await next();
  }),
}));
vi.mock('../modules/auth/auth.service.js', () => ({ authService: {} }));
vi.mock('../modules/instituicoes/instituicao.provision.js', () => ({
  provisionInstituicaoForUser: vi.fn(),
}));
vi.mock('./auth.otp.js', () => ({ initiate2faChallenge: vi.fn() }));

import { getRegisterErrorDetails } from './auth.register.js';
import { DuplicateEmailError } from '../modules/auth/auth.errors.js';

describe('getRegisterErrorDetails', () => {
  it('preserva apenas o conflito de conta conhecido', () => {
    expect(getRegisterErrorDetails(new DuplicateEmailError())).toEqual({
      status: 409,
      message: 'Já existe uma conta com este email. Inicia sessão ou usa recuperação de palavra-passe.',
    });
  });

  it('não expõe mensagens arbitrárias com status controlado pelo provider', () => {
    const error = Object.assign(new Error('postgres://user:secret@internal-db'), { status: 400 });

    expect(getRegisterErrorDetails(error)).toEqual({
      status: 502,
      message: 'Serviço de registo temporariamente indisponível',
    });
  });
});
