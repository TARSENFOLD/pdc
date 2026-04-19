import { http } from './http.js';
import type { ReputacaoBreakdown } from '@pdc/shared';

export const reputationApi = {
  /**
   * Get my own reputation breakdown (Canonical R2.T6)
   */
  getMe: async (): Promise<ReputacaoBreakdown> => {
    return http.get<ReputacaoBreakdown>('/reputacao/me');
  },

  /**
   * Get public score for any profile (Legacy support)
   */
  getByPerfilId: async (perfilId: string): Promise<{ score: number }> => {
    return http.get<{ score: number }>(`/reputacao/${perfilId}`);
  },

  /**
   * Get full breakdown for any profile (Admin/Mentor)
   */
  getBreakdown: async (perfilId: string): Promise<ReputacaoBreakdown> => {
    return http.get<ReputacaoBreakdown>(`/reputacao/${perfilId}/breakdown`);
  },
};
