import { z } from 'zod';
import { RoleSchema } from '../user.js';

export const AdminStatsSchema = z.object({
  totalUtilizadores: z.number().int(),
  totalSimulacoes: z.number().int(),
  totalCursos: z.number().int(),
  denunciasPendentes: z.number().int(),
});

export type AdminStats = z.infer<typeof AdminStatsSchema>;

export const PaginationParamsSchema = z.object({
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export const PaginationSchema = z.object({
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  pageCount: z.number(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export const AuditLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string().optional(),
  accao: z.string(),
  recurso: z.string(),
  recursoId: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  timestamp: z.string(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

export const AuditLogParamsSchema = PaginationParamsSchema.extend({
  userId: z.string().optional(),
  accao: z.string().optional(),
  recurso: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type AuditLogParams = z.infer<typeof AuditLogParamsSchema>;

export const AdminUtilizadoresParamsSchema = PaginationParamsSchema.extend({
  role: RoleSchema.optional(),
  search: z.string().optional(),
});

export type AdminUtilizadoresParams = z.infer<typeof AdminUtilizadoresParamsSchema>;

export const HooksHealthResponseSchema = z.object({
  outbox: z.object({
    pendentes: z.number(),
    falhados: z.number(),
    processados24h: z.number(),
  }),
  hooks: z.array(z.object({
    name: z.string(),
    status: z.enum(['healthy', 'degraded', 'failing']),
    latency: z.string(),
    successRate: z.number(),
  })),
});

export type HooksHealthResponse = z.infer<typeof HooksHealthResponseSchema>;
