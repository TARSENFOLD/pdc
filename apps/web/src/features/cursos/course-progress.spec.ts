import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/http';
import { countCurrentCompletedItems, isEnrollmentRequiredError } from './course-progress';

describe('countCurrentCompletedItems', () => {
  it('ignora progresso de aulas removidas do currículo atual', () => {
    expect(countCurrentCompletedItems(['item-atual'], [
      { itemId: 'item-atual', concluido: true },
      { itemId: 'item-removido', concluido: true },
    ])).toBe(1);
  });

  it('conta cada aula concluída apenas uma vez', () => {
    expect(countCurrentCompletedItems(['item-1'], [
      { itemId: 'item-1', concluido: true },
      { itemId: 'item-1', concluido: true },
    ])).toBe(1);
  });

  it('distingue ausência de inscrição de falhas operacionais', () => {
    expect(isEnrollmentRequiredError(new ApiError(403, 'Sem acesso'))).toBe(true);
    expect(isEnrollmentRequiredError(new ApiError(404, 'Sem inscrição'))).toBe(true);
    expect(isEnrollmentRequiredError(new ApiError(503, 'Indisponível'))).toBe(false);
    expect(isEnrollmentRequiredError(new Error('rede'))).toBe(false);
  });
});
