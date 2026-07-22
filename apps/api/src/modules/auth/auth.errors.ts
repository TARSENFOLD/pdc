export class AuthDomainError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 409,
  ) {
    super(message);
    this.name = 'AuthDomainError';
  }
}

export class DuplicateEmailError extends AuthDomainError {
  constructor() {
    super(
      'Já existe uma conta com este email. Inicia sessão ou usa recuperação de palavra-passe.',
      409,
    );
    this.name = 'DuplicateEmailError';
  }
}
