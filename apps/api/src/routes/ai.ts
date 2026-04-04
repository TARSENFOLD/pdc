import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { aiService } from '../modules/ai/ai.service.js';
import { aiRag } from '../modules/ai/ai.rag.js';
import { ChatPayloadSchema } from '@pdc/shared';

type Vars = { Variables: AuthVariables };
export const aiRoutes = new Hono<Vars>();

aiRoutes.use('*', verifyJwt);

// POST /ai/chat
aiRoutes.post('/chat', zValidator('json', ChatPayloadSchema), async (c) => {
  const { id: alunoId } = c.get('user');
  const { message, stream } = c.req.valid('json');

  const contexto = await aiService.buildContexto(alunoId);
  const ragContext = await aiRag.buscarContextoRelevante(message);
  
  const res = await aiService.chat([{ role: 'user', content: message }], `${contexto} ${ragContext}`, !!stream);

  if (stream) {
    return streamSSE(c, async (sseStream) => {
      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const { done, value } = await reader.read() as { done: boolean; value: Uint8Array | undefined };
        if (done) break;
        
        const chunk = decoder.decode(value);
        await sseStream.writeSSE({ data: chunk });
      }
    });
  }

  const data = await res.json() as Record<string, unknown>;
  return c.json(data);
});

// POST /ai/quiz
aiRoutes.post('/quiz', zValidator('json', z.object({
  cursoId: z.string().min(1),
  moduloId: z.string().min(1),
})), async (c) => {
  const { cursoId, moduloId } = c.req.valid('json');
  const quiz = await aiService.gerarQuiz(cursoId, moduloId);
  return c.json(quiz);
});

// POST /ai/indexar
aiRoutes.post('/indexar', checkRole(['super_admin']), async (c) => {
  await aiRag.indexarConteudo();
  return c.json({ status: 'ok', message: 'Conteúdo indexado para RAG' });
});
