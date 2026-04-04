import { apiClient } from './http.js';
import type { User, Role, AdminStats, AuditLog } from '@pdc/shared';

export const adminApi = {
  getUtilizadores: (params: { page?: number; pageSize?: number }) =>
    apiClient.get<{ data: User[]; pagination: any }>('/admin/utilizadores', { params }),

  updateRole: (id: string, role: Role) =>
    apiClient.put(`/admin/utilizadores/${id}/role`, { role }),

  suspender: (id: string) =>
    apiClient.put(`/admin/utilizadores/${id}/suspender`),

  getStats: () =>
    apiClient.get<AdminStats>('/admin/stats'),

  getAudit: (params: { page?: number; pageSize?: number }) =>
    apiClient.get<{ data: AuditLog[]; pagination: any }>('/admin/audit', { params }),
};
