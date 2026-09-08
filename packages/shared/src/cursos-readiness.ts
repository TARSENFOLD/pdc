import { z } from 'zod';
import { AreaVocacionalSchema } from './schemas/enums.js';
import { inspectCourseModulePlacement } from './cursos-placement.js';
import {
  CURSO_ITEM_IMAGEM_ALT_MAX_LENGTH,
  CursoItemImagensSchema,
} from './cursos-media.js';

export const CursoReadinessStepSchema = z.enum(['info', 'curriculum', 'merit']);
export type CursoReadinessStep = z.infer<typeof CursoReadinessStepSchema>;

export const CursoReadinessIssueSchema = z.object({
  step: CursoReadinessStepSchema,
  path: z.string(),
  message: z.string(),
});
export type CursoReadinessIssue = z.infer<typeof CursoReadinessIssueSchema>;

export interface CursoReadinessItemInput {
  titulo?: string | null | undefined;
  tipo?: string | null | undefined;
  conteudo?: string | null | undefined;
  url?: string | null | undefined;
  videoId?: string | null | undefined;
  imagens?: unknown;
  ordem?: number | null | undefined;
}

interface CursoReadinessModuleInput {
  titulo?: string | null | undefined;
  itens?: readonly CursoReadinessItemInput[] | null | undefined;
}

export interface CursoReadinessInput {
  titulo?: string | null | undefined;
  descricao?: string | null | undefined;
  area?: string | null | undefined;
  nivel?: string | null | undefined;
  capaUrl?: string | null | undefined;
  thumbnailUrl?: string | null | undefined;
  visibilidade?: string | null | undefined;
  gratuito?: boolean | null | undefined;
  preco?: number | null | undefined;
  moeda?: string | null | undefined;
  modulos?: readonly CursoReadinessModuleInput[] | null | undefined;
}

export interface CursoReadinessResult {
  ready: boolean;
  issues: CursoReadinessIssue[];
  byStep: Record<CursoReadinessStep, {
    complete: boolean;
    issues: CursoReadinessIssue[];
  }>;
}

export interface CursoReadinessPolicy {
  allowLocalHttp?: boolean;
}

function isPublishableUrl(value: string, policy: CursoReadinessPolicy): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || (
      policy.allowLocalHttp === true
      && parsed.protocol === 'http:'
      && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function hasValidPublishableUrl(
  value: string | null | undefined,
  policy: CursoReadinessPolicy,
): boolean {
  return value ? isPublishableUrl(value.trim(), policy) : false;
}

export interface CursoLessonReadinessIssue {
  path: string;
  message: string;
}

export function avaliarProntidaoAula(
  item: CursoReadinessItemInput,
  lessonLabel: string,
  policy: CursoReadinessPolicy = {},
): CursoLessonReadinessIssue[] {
  const issues: CursoLessonReadinessIssue[] = [];
  const addIssue = (path: string, message: string) => { issues.push({ path, message }); };

  if ((item.titulo?.trim().length ?? 0) < 3) {
    addIssue('titulo', `Dá um título à aula ${lessonLabel}.`);
  }
  if (typeof item.ordem !== 'number' || !Number.isInteger(item.ordem) || item.ordem < 0) {
    addIssue('ordem', `Define uma ordem válida para a aula ${lessonLabel}.`);
  }

  const supportedTypes: readonly string[] = ['video', 'pdf', 'iframe', 'texto', 'quiz', 'tarefa'];
  if (!item.tipo || !supportedTypes.includes(item.tipo)) {
    addIssue('tipo', `Escolhe um formato válido para a aula ${lessonLabel}.`);
    return issues;
  }
  if (item.tipo === 'video' && !item.videoId?.trim() && !hasValidPublishableUrl(item.url, policy)) {
    addIssue('videoId', `Envia ou indica o vídeo da aula ${lessonLabel}.`);
  } else if ((item.tipo === 'pdf' || item.tipo === 'iframe') && !hasValidPublishableUrl(item.url, policy)) {
    addIssue('url', `Adiciona o ficheiro ou endereço da aula ${lessonLabel}.`);
  } else if (item.tipo === 'quiz' || item.tipo === 'tarefa') {
    addIssue(
      'tipo',
      `O formato ${item.tipo === 'quiz' ? 'Quiz' : 'Tarefa'} ainda não está disponível para publicação.`,
    );
  } else if (item.tipo === 'texto' && (item.conteudo?.trim().length ?? 0) < 10) {
    addIssue('conteudo', `Completa o conteúdo da aula ${lessonLabel}.`);
  }
  const parsedImages = CursoItemImagensSchema.safeParse(item.imagens ?? []);
  if (!parsedImages.success) {
    parsedImages.error.issues.forEach((issue) => {
      const [imageIndex, field] = issue.path;
      if (typeof imageIndex === 'number' && field === 'url') {
        addIssue(
          `imagens.${String(imageIndex)}.url`,
          `Corrige o endereço da imagem ${String(imageIndex + 1)} da aula ${lessonLabel}.`,
        );
        return;
      }
      if (typeof imageIndex === 'number' && field === 'alt') {
        const message = issue.code === 'too_big'
          ? `Reduz a descrição da imagem ${String(imageIndex + 1)} para no máximo ${String(CURSO_ITEM_IMAGEM_ALT_MAX_LENGTH)} caracteres.`
          : `Descreve a imagem ${String(imageIndex + 1)} da aula ${lessonLabel}.`;
        addIssue(`imagens.${String(imageIndex)}.alt`, message);
        return;
      }
      const issuePath = issue.path.length > 0 ? `.${issue.path.join('.')}` : '';
      addIssue('imagens' + issuePath, `Corrige as imagens da aula ${lessonLabel}.`);
    });
  } else {
    parsedImages.data.forEach((image, imageIndex) => {
      if (!hasValidPublishableUrl(image.url, policy)) {
        addIssue(
          `imagens.${String(imageIndex)}.url`,
          `Corrige o endereço da imagem ${String(imageIndex + 1)} da aula ${lessonLabel}.`,
        );
      }
    });
  }

  return issues;
}

export function avaliarProntidaoCurso(
  input: CursoReadinessInput,
  policy: CursoReadinessPolicy = {},
): CursoReadinessResult {
  const issues: CursoReadinessIssue[] = [];
  const addIssue = (step: CursoReadinessStep, path: string, message: string) => {
    issues.push({ step, path, message });
  };

  if ((input.titulo?.trim().length ?? 0) < 3) {
    addIssue('info', 'titulo', 'Adiciona um título com pelo menos 3 caracteres.');
  }
  if ((input.descricao?.trim().length ?? 0) < 10) {
    addIssue('info', 'descricao', 'Escreve uma descrição com pelo menos 10 caracteres.');
  }
  if (!hasValidPublishableUrl(input.capaUrl, policy) && !hasValidPublishableUrl(input.thumbnailUrl, policy)) {
    addIssue('info', 'capaUrl', 'Adiciona uma imagem de capa válida.');
  }
  if (!AreaVocacionalSchema.safeParse(input.area).success) {
    addIssue('info', 'area', 'Escolhe uma área vocacional válida.');
  }
  if (!input.nivel || !['basico', 'medio', 'avancado'].includes(input.nivel)) {
    addIssue('info', 'nivel', 'Escolhe o nível do curso.');
  }

  const modules = input.modulos ?? [];
  if (modules.length === 0) addIssue('curriculum', 'modulos', 'Adiciona pelo menos um módulo.');
  modules.forEach((module, moduleIndex) => {
    if ((module.titulo?.trim().length ?? 0) < 3) {
      addIssue('curriculum', `modulos.${String(moduleIndex)}.titulo`, `Dá um nome ao módulo ${String(moduleIndex + 1)}.`);
    }
    const items = module.itens ?? [];
    if (items.length === 0) {
      addIssue('curriculum', `modulos.${String(moduleIndex)}.itens`, `Adiciona pelo menos uma aula ao módulo ${String(moduleIndex + 1)}.`);
    }
    const placement = inspectCourseModulePlacement(items);
    if (placement.videoIndexes.length > 1) {
      addIssue('curriculum', `modulos.${String(moduleIndex)}.itens`, `O módulo ${String(moduleIndex + 1)} pode ter no máximo um vídeo.`);
    }
    if (placement.duplicateOrderIndexes.length > 0) {
      addIssue('curriculum', `modulos.${String(moduleIndex)}.itens`, `As aulas do módulo ${String(moduleIndex + 1)} precisam de posições únicas.`);
    }
    if (placement.misplacedVideoIndex !== undefined) {
      addIssue(
        'curriculum',
        `modulos.${String(moduleIndex)}.itens.${String(placement.misplacedVideoIndex)}`,
        `O vídeo deve ser a primeira aula do módulo ${String(moduleIndex + 1)}.`,
      );
    }
    items.forEach((item, itemIndex) => {
      const lessonLabel = `${String(moduleIndex + 1)}.${String(itemIndex + 1)}`;
      const itemPath = `modulos.${String(moduleIndex)}.itens.${String(itemIndex)}`;
      avaliarProntidaoAula(item, lessonLabel, policy).forEach((issue) => {
        addIssue('curriculum', `${itemPath}.${issue.path}`, issue.message);
      });
    });
  });

  const visibilidade = input.visibilidade ?? 'publico';
  const gratuito = input.gratuito ?? true;
  if (!['publico', 'privado', 'institucional'].includes(visibilidade)) {
    addIssue('merit', 'visibilidade', 'Escolhe quem pode encontrar este curso.');
  }
  if (!gratuito) {
    if (!(typeof input.preco === 'number' && Number.isFinite(input.preco) && input.preco > 0)) {
      addIssue('merit', 'preco', 'Define um preço superior a zero ou marca o curso como gratuito.');
    }
    if (!/^[A-Za-z]{3}$/.test(input.moeda?.trim() ?? '')) {
      addIssue('merit', 'moeda', 'Indica uma moeda válida com 3 letras.');
    }
  }

  const stepResult = (step: CursoReadinessStep) => {
    const stepIssues = issues.filter((issue) => issue.step === step);
    return { complete: stepIssues.length === 0, issues: stepIssues };
  };
  return {
    ready: issues.length === 0,
    issues,
    byStep: {
      info: stepResult('info'),
      curriculum: stepResult('curriculum'),
      merit: stepResult('merit'),
    },
  };
}
