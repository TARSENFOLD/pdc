import { z } from 'zod';

export const BehaviorPatternSchema = z.object({
  id: z.string().optional(),
  perfil: z.string(), // ID do Perfil/Aluno
  domainId: z.string(), // Slug da área vocacional ou domínio técnico
  successRate: z.number().min(0).max(1),
  technicalScore: z.number().min(0).max(10),
  cognitiveFluidity: z.number().min(0).max(10), 
  resilienceIndex: z.number().min(0).max(10), 
  focusStability: z.number().min(0).max(10), 
  hesitationIndex: z.number().min(0).max(10), // Mandatário v2.2
  decisionSpeedAvg: z.number().min(0), // ms
  tinaSummary: z.record(z.unknown()).optional(), 
  lastUpdatedAt: z.string().datetime(),
});

export type BehaviorPattern = z.infer<typeof BehaviorPatternSchema>;
