import type { User } from '@pdc/shared';

export function needsLegalCompliance(user: User): boolean {
  if (!user.perfilId) return false;
  return user.consentimentoEstado !== 'completo' || user.estadoMenoridade === undefined || user.estadoMenoridade === 'pendente';
}
