import { http } from './http';

export interface RankingUser {
  id: string;
  nome: string;
  avatarUrl?: string;
  xp: number;
}

export const estudanteApi = {
  getRanking: () => 
    http.get<{ data: RankingUser[] }>('/estudante/ranking'),
  
  // Certificados já estão em cursosApi mas poderiam estar aqui
};
