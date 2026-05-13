import { errors } from '@strapi/utils';

const { ValidationError } = errors;

function validateDuracaoSegundos(data: unknown): void {
  if (typeof data !== 'object' || data === null || !('duracaoSegundos' in data)) return;

  const duracaoSegundos = (data as { duracaoSegundos?: unknown }).duracaoSegundos;
  if (typeof duracaoSegundos === 'number' && duracaoSegundos < 0) {
    throw new ValidationError('duracaoSegundos deve ser maior ou igual a 0');
  }
}

export default {
  beforeCreate(event: { params: { data?: unknown } }) {
    validateDuracaoSegundos(event.params.data);
  },
  beforeUpdate(event: { params: { data?: unknown } }) {
    validateDuracaoSegundos(event.params.data);
  },
};
