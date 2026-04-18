import { http } from './http.js';

export const featureFlagsApi = {
  getEffective: async (): Promise<Record<string, boolean>> => {
    try {
      return await http.get<Record<string, boolean>>('/feature-flags/effective');
    } catch (error) {
      console.error('Falha ao obter feature flags, usando fail-open:', error);
      return {}; // Fail-open: sem flags restritivas
    }
  },
};
