import { z } from 'zod';

export const LandingOpcaoSchema = z.object({
  emoji: z.string(),
  texto: z.string(),
});

export type LandingOpcao = z.infer<typeof LandingOpcaoSchema>;

export const LandingPerguntaSchema = z.object({
  texto: z.string(),
  opcoes: z.array(LandingOpcaoSchema),
});

export type LandingPergunta = z.infer<typeof LandingPerguntaSchema>;

export const LandingQuestionsResponseSchema = z.object({
  perguntas: z.array(LandingPerguntaSchema),
});

export type LandingQuestionsResponse = z.infer<typeof LandingQuestionsResponseSchema>;

export const LandingVereditoSchema = z.object({
  area: z.string(),
  score: z.number(),
  arquetipo: z.string(),
  proximoPasso: z.string(),
  simulacoes: z.array(z.string()),
});

export type LandingVeredito = z.infer<typeof LandingVereditoSchema>;
