import { http } from './http.js';

export interface ReputationBreakdown {
  score: number;
  dimensions: {
    ratingsMedia: number;
    cursosPublicados: number;
    simulacoes: number;
    conquistas: number;
    tempoPlataforma: number;
    engagement: number;
  };
}

export const reputationApi = {
  getMe: async (): Promise<ReputationBreakdown> => {
    return http.get<ReputationBreakdown>('/reputacao/me');
  },
  getByPerfilId: async (perfilId: string): Promise<{ score: number }> => {
    return http.get<{ score: number }>(`/reputacao/${perfilId}`);
  },
  getBreakdown: async (perfilId: string): Promise<ReputationBreakdown> => {
    return http.get<ReputationBreakdown>(`/reputacao/${perfilId}/breakdown`);
  },
};
