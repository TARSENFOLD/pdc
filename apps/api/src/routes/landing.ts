import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AreaVocacionalSchema, LandingVereditoSchema } from '@pdc/shared';
import { createRateLimit } from '../middleware/rateLimit.js';
import { pulseService } from '../modules/landing/pulse.service.js';
import { tinaService } from '../modules/tina/tina.service.js';

const activitySchema = z.object({
  sessionId: z.string().min(1).max(64),
  area: AreaVocacionalSchema.optional(),
});

const questionsSchema = z.object({
  area: AreaVocacionalSchema,
  regiao: z.string().optional(),
});

const verdictSchema = z.object({
  area: AreaVocacionalSchema,
  contexto: z.string().trim().min(3).max(500),
  respostas: z.array(z.string().trim().min(1).max(300)).length(5),
});

const pulseLimiter = createRateLimit({
  tokens: 10,
  window: '1 m',
  keyPrefix: 'landing-pulse',
  key: 'ip',
});

const questionsLimiter = createRateLimit({
  tokens: 3,
  window: '1 h',
  keyPrefix: 'landing-questions',
  key: 'ip',
  errorMessage: 'Limite de 3 tentativas atingido. Regista-te para continuar.',
});

function fallbackVerdict(area: string, respostas: string[]) {
  const score = Math.min(92, 68 + new Set(respostas).size * 4);
  return LandingVereditoSchema.parse({
    area,
    score,
    arquetipo: 'Explorador Pragmático',
    proximoPasso: 'Experimenta uma simulação curta e compara o que te deu energia com o que exigiu mais esforço.',
    simulacoes: [
      `Desafio introdutório de ${area}`,
      `Um dia profissional em ${area}`,
      `Decisão prática em ${area}`,
    ],
  });
}

export const landingRoutes = new Hono();

landingRoutes.post(
  '/pulse',
  pulseLimiter,
  zValidator('json', activitySchema),
  (c) => {
    const { sessionId, area } = c.req.valid('json');
    pulseService.recordActivity(sessionId, area);
    return c.json({ ok: true });
  },
);

landingRoutes.post(
  '/veredito',
  zValidator('json', verdictSchema),
  async (c) => {
    const input = c.req.valid('json');
    const veredito = await tinaService.gerarVereditoDesafio(input);
    return c.json(veredito ?? fallbackVerdict(input.area, input.respostas));
  },
);

landingRoutes.post(
  '/questions',
  questionsLimiter,
  zValidator('json', questionsSchema),
  async (c) => {
    const { area, regiao } = c.req.valid('json');
    const perguntas = await tinaService.gerarPerguntasDesafio(area, regiao);
    return c.json({ perguntas });
  },
);
