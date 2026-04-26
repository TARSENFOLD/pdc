import { z } from 'zod';

export const HomeSummarySchema = z.object({
  greeting: z.string(),
  personalizedMessage: z.string(),
  stats: z.object({
    xp: z.number().optional(),
    reputacao: z.number(),
    conquistasCount: z.number().optional(),
    vinkulosCount: z.number().optional(),
    activeStudents: z.number().optional(),
    activePrograms: z.number().optional(),
    pendingActions: z.number().default(0),
  }),
  nextDirective: z.object({
    label: z.string(),
    to: z.string(),
    type: z.enum(['learning', 'review', 'collaboration', 'setup']),
    description: z.string(),
  }).nullable(),
  socialPulse: z.array(z.object({
    id: z.string(),
    type: z.string(),
    message: z.string(),
    timestamp: z.string(),
  })),
  quickActions: z.array(z.object({
    label: z.string(),
    to: z.string(),
    icon: z.string(), // Name of the icon
    variant: z.enum(['primary', 'secondary', 'ghost']).default('secondary'),
  })),
});

export type HomeSummary = z.infer<typeof HomeSummarySchema>;
