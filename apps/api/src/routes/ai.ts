import { Hono, type Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import pino from 'pino';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import {
  AiContentAccessError,
  AiContentAccessRecordSchema,
  aiContentIdentifier,
  aiService,
  parseAiContentVersions,
  type AiContentAccessFailure,
} from '../modules/ai/ai.service.js';
import { aiRag } from '../modules/ai/ai.rag.js';
import { ChatPayloadSchema } from '@pdc/shared';
import {
  CONTENT_ACCESS_ERRORS,
  decideLearnerAccess,
} from '../modules/conteudo/content-access.service.js';
import { cursosService } from '../modules/cursos/cursos.service.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { contentRelationIdentityFilters } from '../modules/conteudo/content-access.repository.js';

type Vars = { Variables: AuthVariables };
export const aiRoutes = new Hono<Vars>();
const log = pino({ name: 'routes:ai' });
const COURSE_REVIEWER_ROLES = ['comite_cientifico', 'moderador'] as const;

const QuizEnrollmentSchema = z.object({
  id: z.union([z.string().min(1), z.number().int()]),
}).passthrough();

const PublishedQuizCourseSchema = AiContentAccessRecordSchema.extend({
  modulos: z.array(z.object({
    id: z.string().min(1),
    documentId: z.string().min(1).optional(),
  }).passthrough()),
});

function respondContentAccessFailure(
  c: Context<Vars>,
  decision: AiContentAccessFailure,
): Response {
  switch (decision) {
    case 'preview_only':
      return c.json(CONTENT_ACCESS_ERRORS.preview_only, 403);
    case 'content_not_available':
      return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
    case 'dependency_unavailable':
      return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
    case 'content_not_found':
      return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
  }
}

function logRedactedDependencyFailure(operation: 'personal-context' | 'rag-context' | 'quiz' | 'index', error: Error | null): void {
  log.error(
    { operation, errorType: error?.name ?? 'non_error' },
    'Dependência de conteúdo indisponível para operação de IA',
  );
}

aiRoutes.use('*', verifyJwt);

// POST /ai/chat
aiRoutes.post('/chat', zValidator('json', ChatPayloadSchema), async (c) => {
  const actor = c.get('user');
  const { message, messages, stream } = c.req.valid('json');
  const prompt = message ?? messages?.at(-1)?.content;
  if (!prompt) return c.json({ error: 'message is required' }, 400);

  let contexto: string;
  try {
    contexto = await aiService.buildContexto(actor);
  } catch (error) {
    if (error instanceof AiContentAccessError) {
      if (error.decision === 'dependency_unavailable') {
        logRedactedDependencyFailure('personal-context', error);
      }
      return respondContentAccessFailure(c, error.decision);
    }
    logRedactedDependencyFailure('personal-context', error instanceof Error ? error : null);
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
  let ragContext: string;
  try {
    ragContext = await aiRag.buscarContextoRelevante(prompt);
  } catch (error) {
    logRedactedDependencyFailure('rag-context', error instanceof Error ? error : null);
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
  
  const res = await aiService.chat(messages ?? [{ role: 'user', content: prompt }], `${contexto} ${ragContext}`, stream);

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
  const actor = c.get('user');
  const { cursoId, moduloId } = c.req.valid('json');
  try {
    const versions = parseAiContentVersions(await cursosService.obterVersoesCurso(cursoId));
    const current = versions.current ?? versions.published;
    const reference = current ?? versions.published;
    const enrollments = reference
      ? await strapiGet<z.infer<typeof QuizEnrollmentSchema>>('/inscricoes', {
        'filters[perfil][userId][$eq]': actor.id,
        ...contentRelationIdentityFilters('curso', aiContentIdentifier(reference)),
        'pagination[pageSize]': '1',
      })
      : undefined;
    const relationExists = enrollments !== undefined
      && z.array(QuizEnrollmentSchema).parse(enrollments.data).length > 0;
    const decision = decideLearnerAccess({
      actor,
      authorId: current?.autorId,
      reviewerRoles: COURSE_REVIEWER_ROLES,
      currentState: current?.estado,
      publishedState: versions.published?.estado,
      hasPublishedVersion: versions.published !== undefined,
      relationExists,
      accessPolicy: relationExists ? 'granted' : 'open',
    });
    if (decision !== 'allow') return respondContentAccessFailure(c, decision);
    if (!versions.published) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);

    const publishedCourseRecord = await cursosService.obterCursoComModulos(
      aiContentIdentifier(versions.published),
      'published',
    );
    if (!publishedCourseRecord) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    const publishedCourse = PublishedQuizCourseSchema.parse(publishedCourseRecord);
    const publishedModule = publishedCourse.modulos.find(
      (module) => module.id === moduloId || module.documentId === moduloId,
    );
    if (!publishedModule) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);

    const quiz = await aiService.gerarQuiz(
      aiContentIdentifier(versions.published),
      publishedModule.id,
    );
    return c.json(quiz);
  } catch (error) {
    logRedactedDependencyFailure('quiz', error instanceof Error ? error : null);
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

// POST /ai/indexar
aiRoutes.post('/indexar', checkRole(['super_admin']), async (c) => {
  try {
    await aiRag.indexarConteudo();
    return c.json({ status: 'ok', message: 'Conteúdo indexado para RAG' });
  } catch (error) {
    logRedactedDependencyFailure('index', error instanceof Error ? error : null);
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});
