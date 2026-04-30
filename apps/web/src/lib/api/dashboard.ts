import { http } from './http';
import type { MentorDashboard, ModeradorDashboard } from '@pdc/shared';

export const dashboardApi = {
  getMentor: () => http.get<MentorDashboard>('/dashboard/mentor'),
  getModerador: () => http.get<ModeradorDashboard>('/dashboard/moderador'),
};
