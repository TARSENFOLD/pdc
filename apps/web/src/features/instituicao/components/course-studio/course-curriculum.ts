import type { CriarCursoPayload } from '@pdc/shared';
import type { LucideIcon } from 'lucide-react';
import { ClipboardCheck, FileText, Frame, PlayCircle, ScrollText, Trophy } from 'lucide-react';

export type CourseModuleDraft = CriarCursoPayload['modulos'][number];
export type CourseItemDraft = CourseModuleDraft['itens'][number];
export type CourseItemType = CourseItemDraft['tipo'];

export interface CourseItemTypeOption {
  value: CourseItemType;
  label: string;
  description: string;
  icon: LucideIcon;
  publishable: boolean;
}

interface CourseContentGuidance {
  label: string;
  helper: string;
  placeholder: string;
}

const TEXT_ITEM_TYPE: CourseItemTypeOption = {
  value: 'texto',
  label: 'Texto',
  description: 'Leitura, explicação ou guia passo a passo.',
  icon: ScrollText,
  publishable: true,
};

export const COURSE_ITEM_TYPES: CourseItemTypeOption[] = [
  { value: 'video', label: 'Vídeo', description: 'Aula em vídeo alojada no PDC ou externa.', icon: PlayCircle, publishable: true },
  TEXT_ITEM_TYPE,
  { value: 'pdf', label: 'PDF', description: 'Documento ou material para consulta.', icon: FileText, publishable: true },
  { value: 'quiz', label: 'Quiz', description: 'Disponível quando o editor de perguntas estiver concluído.', icon: Trophy, publishable: false },
  { value: 'tarefa', label: 'Tarefa', description: 'Disponível quando o fluxo de entrega e avaliação estiver concluído.', icon: ClipboardCheck, publishable: false },
  { value: 'iframe', label: 'Externo', description: 'Conteúdo incorporado através de URL.', icon: Frame, publishable: true },
];

export function getCourseItemType(type: CourseItemType): CourseItemTypeOption {
  return COURSE_ITEM_TYPES.find((option) => option.value === type) ?? TEXT_ITEM_TYPE;
}

export function isCourseItemType(value: string): value is CourseItemType {
  return COURSE_ITEM_TYPES.some((option) => option.value === value);
}

export function normalizeCourseItems(items: CourseItemDraft[]): CourseItemDraft[] {
  const videos = items.filter((item) => item.tipo === 'video');
  const remainingItems = items.filter((item) => item.tipo !== 'video');
  return [...videos, ...remainingItems].map((item, index) => ({ ...item, ordem: index + 1 }));
}

export function getCourseContentGuidance(type: CourseItemType): CourseContentGuidance {
  if (type === 'video') {
    return {
      label: 'Resumo apresentado abaixo do vídeo',
      helper: 'Resume os pontos principais e indica o que o estudante deve observar ou fazer a seguir.',
      placeholder: 'Ex.: Neste vídeo vais conhecer os conceitos essenciais do módulo.\n\nPresta atenção a...\n\nDepois de assistir, experimenta...',
    };
  }
  if (type === 'pdf') {
    return {
      label: 'Orientação apresentada com o documento',
      helper: 'Indica o objetivo da leitura, as páginas importantes e a ação esperada.',
      placeholder: 'Ex.: Consulta as páginas 2 a 6 para compreender...\n\nEnquanto lês, identifica...\n\nNo final, regista...',
    };
  }
  if (type === 'quiz') {
    return {
      label: 'Estrutura inicial do quiz',
      helper: 'Regista a pergunta, opções, resposta correta e explicação enquanto o editor avançado não estiver ativo.',
      placeholder: 'Pergunta: Qual é...?\n\nA) ...\nB) ...\nC) ...\n\nResposta correta: B\nExplicação: ...',
    };
  }
  if (type === 'tarefa') {
    return {
      label: 'Instruções apresentadas ao estudante',
      helper: 'Explica o objetivo, os passos, o que deve ser entregue e como será avaliado.',
      placeholder: 'Objetivo: ...\n\nO que fazer:\n1. ...\n2. ...\n\nO que entregar: ...\nCritérios de qualidade: ...',
    };
  }
  return {
    label: 'Conteúdo principal da aula',
    helper: 'Começa pelo objetivo, desenvolve a explicação com exemplos e termina com uma conclusão ou próximo passo.',
    placeholder: 'Ex.: Nesta aula vais compreender...\n\n1. Introdução ao tema\n2. Conceito principal\n3. Exemplo aplicado\n\nNo final, deves ser capaz de...',
  };
}

export function createCourseItem(type: CourseItemType, ordem: number): CourseItemDraft {
  const label = getCourseItemType(type).label;
  return {
    titulo: `Nova aula — ${label}`,
    tipo: type,
    ordem,
    conteudo: '',
  };
}

export function duplicateCourseItem(item: CourseItemDraft, ordem: number): CourseItemDraft {
  return {
    titulo: `${item.titulo} (cópia)`,
    tipo: item.tipo,
    ordem,
    ...(item.conteudo !== undefined ? { conteudo: item.conteudo } : {}),
    ...(item.url !== undefined ? { url: item.url } : {}),
    ...(item.videoId !== undefined ? { videoId: item.videoId } : {}),
    ...(item.imagens !== undefined ? { imagens: item.imagens.map((image) => ({ ...image })) } : {}),
  };
}

export function duplicateCourseModule(module: CourseModuleDraft, ordem: number): CourseModuleDraft {
  return {
    titulo: `${module.titulo} (cópia)`,
    ordem,
    itens: normalizeCourseItems(module.itens.map((item, index) => duplicateCourseItem(item, index + 1))),
  };
}

export function reorderDrafts<T extends { ordem: number }>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const moved = next.splice(from, 1)[0];
  if (!moved) return items;
  next.splice(to, 0, moved);
  return next.map((item, index) => ({ ...item, ordem: index + 1 }));
}
