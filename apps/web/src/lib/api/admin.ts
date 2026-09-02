import { http } from './http.js';
import type { 
  User, 
  Role, 
  AdminStats, 
  AuditLog, 
  AdminUtilizadoresParams, 
  AuditLogParams, 
  Pagination 
} from '@pdc/shared';

interface EventoTelemetria {
  id: string;
  tipo: string;
  timestamp: string;
  user?: string;
  payload?: unknown;
}

interface TelemetriaResponse {
  data: EventoTelemetria[];
  meta?: {
    pagination?: {
      pageCount?: number;
    };
  };
}

interface RelatorioRetencao {
  totalEstudantes: number;
  estudantesAtivos: number;
  taxaRetencao: number;
  semDados: boolean;
  totalEventos: number;
}

export const adminApi = {
  getUtilizadores: (params: AdminUtilizadoresParams) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', params.page.toString());
    if (params.pageSize) q.set('pageSize', params.pageSize.toString());
    if (params.search) q.set('search', params.search);
    if (params.role) q.set('role', params.role);
    return http.get<{ data: User[]; pagination: Pagination }>(`/admin/utilizadores?${q.toString()}`);
  },

  updateRole: (id: string, role: Role) =>
    http.put(`/admin/utilizadores/${id}/role`, { role }),

  suspender: (id: string) =>
    http.put(`/admin/utilizadores/${id}/suspender`, undefined),

  getStats: () =>
    http.get<AdminStats>('/admin/stats'),

  getAudit: (params: AuditLogParams) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', params.page.toString());
    if (params.pageSize) q.set('pageSize', params.pageSize.toString());
    if (params.userId) q.set('userId', params.userId);
    if (params.accao) q.set('accao', params.accao);
    return http.get<{ data: AuditLog[]; pagination: Pagination }>(`/admin/audit?${q.toString()}`);
  },

  reativar: (id: string) => http.put(`/admin/utilizadores/${id}/reativar`, undefined),

  repararInstituicao: (id: string) => http.post<{
    data: { id: string | number; documentId?: string; nome: string };
    created: boolean;
  }>(`/admin/utilizadores/${id}/reparar-instituicao`, {}),

  getTelemetria: (params: { tipo?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (params.tipo) q.set('tipo', params.tipo);
    if (params.page) q.set('page', params.page.toString());
    if (params.pageSize) q.set('pageSize', params.pageSize.toString());
    return http.get<TelemetriaResponse>(`/admin/telemetria?${q.toString()}`);
  },

  getRelatoriosRetencao: () => http.get<RelatorioRetencao>('/admin/relatorios/retencao'),
};
