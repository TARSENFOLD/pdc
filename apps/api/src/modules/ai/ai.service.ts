import pino from 'pino';
import { z } from 'zod';
import { strapiGet } from '../strapi/strapi.client.js';
import { vocacionalService } from '../vocacional/vocacional.service.js';
import {
  PreMigrationContentStateSchema,
  type ChatMessage,
  type QuizPergunta,
} from '@pdc/shared';
import { env } from '../../lib/env.js';
import { cursosService } from '../cursos/cursos.service.js';
import {
  loadSimulacaoVersions,
  type StrapiSimulacaoAccessRecord,
} from '../simulacoes/simulacao-access.repository.js';
import {
  decideLearnerAccess,
  type ContentAccessActor,
  type LearnerAccessDecision,
} from '../conteudo/content-access.service.js';
import type { ContentVersions } from '../conteudo/content-access.repository.js';

const log = pino({ name: 'ai-service' });

const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = env.DEEPSEEK_BASE_URL;
const DEEPSEEK_MODEL = env.DEEPSEEK_MODEL;
const OLLAMA_BASE_URL = env.OLLAMA_BASE_URL;
const OLLAMA_MODEL = env.OLLAMA_MODEL;

const COURSE_REVIEWER_ROLES = ['comite_cientifico', 'moderador'] as const;
const SIMULATION_REVIEWER_ROLES = ['comite_cientifico', 'moderador'] as const;

const StrapiEntityReferenceSchema = z.object({
  id: z.union([z.string().min(1), z.number().int()]),
  documentId: z.string().min(1).optional(),
}).passthrough();

const ContextAttemptSchema = z.object({
  id: z.union([z.string().min(1), z.number().int()]),
  simulacao: StrapiEntityReferenceSchema.nullish(),
}).passthrough();

const ContextEnrollmentSchema = z.object({
  id: z.union([z.string().min(1), z.number().int()]),
  curso: StrapiEntityReferenceSchema.nullish(),
}).passthrough();

export const AiContentAccessRecordSchema = z.object({
  id: z.union([z.string().min(1), z.number().int()]),
  documentId: z.string().min(1).optional(),
  titulo: z.string().min(1),
  autorId: z.string().min(1),
  estado: PreMigrationContentStateSchema,
}).passthrough();

export type AiContentAccessRecord = z.infer<typeof AiContentAccessRecordSchema>;
export type AiContentAccessFailure = Exclude<LearnerAccessDecision, 'allow'>
  | 'dependency_unavailable';

export class AiContentAccessError extends Error {
  constructor(readonly decision: AiContentAccessFailure) {
    super('AI content access denied');
    this.name = 'AiContentAccessError';
  }
}

export function parseAiContentVersions<T>(
  versions: ContentVersions<T>,
): ContentVersions<AiContentAccessRecord> {
  return {
    ...(versions.current === undefined
      ? {}
      : { current: AiContentAccessRecordSchema.parse(versions.current) }),
    ...(versions.published === undefined
      ? {}
      : { published: AiContentAccessRecordSchema.parse(versions.published) }),
  };
}

type StrapiEntityReference = z.infer<typeof StrapiEntityReferenceSchema>;

export function aiContentIdentifier(entity: {
  id: string | number;
  documentId?: string | undefined;
}): string {
  return entity.documentId ?? String(entity.id);
}

function uniqueReferences(references: readonly StrapiEntityReference[]): StrapiEntityReference[] {
  const unique = new Map<string, StrapiEntityReference>();
  for (const reference of references) {
    unique.set(aiContentIdentifier(reference), reference);
  }
  return [...unique.values()];
}

function authorizedPublishedTitle(
  actor: ContentAccessActor,
  versions: ContentVersions<AiContentAccessRecord>,
  reviewerRoles: readonly ContentAccessActor['role'][],
): string {
  const current = versions.current ?? versions.published;
  const decision = decideLearnerAccess({
    actor,
    authorId: current?.autorId,
    reviewerRoles,
    currentState: current?.estado,
    publishedState: versions.published?.estado,
    hasPublishedVersion: versions.published !== undefined,
    relationExists: true,
    accessPolicy: 'granted',
  });
  if (decision !== 'allow') throw new AiContentAccessError(decision);
  if (!versions.published) throw new AiContentAccessError('content_not_found');
  return versions.published.titulo;
}

async function resolveCourseTitle(
  actor: ContentAccessActor,
  reference: StrapiEntityReference,
): Promise<string> {
  const versions = parseAiContentVersions(
    await cursosService.obterVersoesCurso(aiContentIdentifier(reference)),
  );
  return authorizedPublishedTitle(actor, versions, COURSE_REVIEWER_ROLES);
}

async function resolveSimulationTitle(
  actor: ContentAccessActor,
  reference: StrapiEntityReference,
): Promise<string> {
  const versions: ContentVersions<StrapiSimulacaoAccessRecord> = await loadSimulacaoVersions(
    aiContentIdentifier(reference),
  );
  return authorizedPublishedTitle(
    actor,
    parseAiContentVersions(versions),
    SIMULATION_REVIEWER_ROLES,
  );
}

export const aiService = {
  async buildContexto(actor: ContentAccessActor): Promise<string> {
    try {
      const [perfil, tentativasRes, inscricoesRes] = await Promise.all([
        vocacionalService.calcularPerfil(actor.id),
        strapiGet<z.infer<typeof ContextAttemptSchema>>('/tentativas', {
          'filters[perfil][userId][$eq]': actor.id,
          'filters[dataFim][$notNull]': 'true',
          populate: 'simulacao',
        }),
        strapiGet<z.infer<typeof ContextEnrollmentSchema>>('/inscricoes', {
          'filters[perfil][userId][$eq]': actor.id,
          populate: 'curso',
        }),
      ]);

      const attempts = z.array(ContextAttemptSchema).parse(tentativasRes.data);
      const enrollments = z.array(ContextEnrollmentSchema).parse(inscricoesRes.data);
      const simulationReferences = uniqueReferences(attempts.map((attempt) => {
        if (!attempt.simulacao) throw new AiContentAccessError('content_not_found');
        return attempt.simulacao;
      }));
      const courseReferences = uniqueReferences(enrollments.map((enrollment) => {
        if (!enrollment.curso) throw new AiContentAccessError('content_not_found');
        return enrollment.curso;
      }));

      const [simulationTitles, courseTitles] = await Promise.all([
        Promise.all(simulationReferences.map((reference) => resolveSimulationTitle(actor, reference))),
        Promise.all(courseReferences.map((reference) => resolveCourseTitle(actor, reference))),
      ]);
      const sims = simulationTitles.join(', ');
      const cursos = courseTitles.join(', ');

      return `Perfil Vocacional: Score Global ${perfil.scoreGlobal.toString()}, Aptidão ${perfil.aptidao.toString()}, Dedicação ${perfil.dedicacao.toString()}. Simulações concluídas: ${sims || 'Nenhuma'}. Cursos inscritos: ${cursos || 'Nenhum'}.`;
    } catch (error) {
      if (error instanceof AiContentAccessError) {
        log.warn({ actorId: actor.id, decision: error.decision }, 'Contexto pessoal bloqueado pela política de conteúdo');
        throw error;
      }
      log.error(
        { actorId: actor.id, errorType: error instanceof Error ? error.name : 'non_error' },
        'Falha ao validar conteúdo do contexto pessoal',
      );
      throw new AiContentAccessError('dependency_unavailable');
    }
  },

  async chat(messages: ChatMessage[], contexto: string, stream: boolean): Promise<Response> {
    const systemMessage: ChatMessage = {
      role: 'system',
      content: `És o Tutor IA do PDC (Por Dentro do Curso). O teu objetivo é orientar estudantes angolanos na sua jornada vocacional. Contexto do estudante: ${contexto}`,
    };

    const fullMessages = [systemMessage, ...messages];

    if (!DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY não configurada');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => { controller.abort(); }, 10000);

      const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: fullMessages,
          stream,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.status >= 500) {
        return await this.fallbackOllama(fullMessages, stream);
      }

      return res;
    } catch (err) {
      log.error({ err }, 'DeepSeek error, falling back to Ollama');
      return this.fallbackOllama(fullMessages, stream);
    }
  },

  async fallbackOllama(messages: ChatMessage[], stream: boolean): Promise<Response> {
    return await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream,
      }),
    });
  },

  async gerarQuiz(cursoId: string, moduloId: string): Promise<QuizPergunta[]> {
    const prompt = `Gera um quiz com 5 perguntas de escolha múltipla para o módulo ${moduloId} do curso ${cursoId}. Retorna apenas um JSON array de QuizPergunta [{id, pergunta, opcoes: [4], respostaCorreta: 0-3, explicacao}].`;
    
    const res = await this.chat([{ role: 'user', content: prompt }], 'Geração de Quiz', false);
    const data = await res.json() as { choices: Array<{ message: { content: string } }> } | { message: { content: string } };
    
    let content = '';
    if ('choices' in data) {
      content = data.choices[0]?.message.content || '[]';
    } else if ('message' in data) {
      content = data.message.content;
    }

    try {
      return JSON.parse(content.replace(/```json|```/g, '')) as QuizPergunta[];
    } catch {
      return [];
    }
  },
};
