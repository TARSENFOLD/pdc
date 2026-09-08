import type {
  CriarCursoPayload,
  Curso,
  Inscricao,
  ItemModulo,
  Modulo,
  ProgressoItem,
  StrapiPublicationStatus,
} from '@pdc/shared';
import { strapiDelete, strapiGet, strapiPost, strapiPut } from '../strapi/strapi.client.js';

export interface ExistingModuloItem extends ItemModulo {
  documentId?: string;
}

export interface ExistingModulo extends Omit<Modulo, 'itens'> {
  documentId?: string;
  itens: ExistingModuloItem[];
}

export interface CursoComModulos extends Omit<Curso, 'modulos'> {
  documentId?: string;
  thumbnailUrl?: string;
  modulos?: ExistingModulo[];
}

export interface InscricaoStrapi extends Inscricao {
  documentId?: string;
  modulosConcluidos?: unknown;
}

type CursoModuloPayload = CriarCursoPayload['modulos'][number];
type CursoItemPayload = CursoModuloPayload['itens'][number];
type CursoBasePayload = Omit<CriarCursoPayload, 'modulos' | 'regrasAcesso' | 'estado'>;
type CursoBaseUpdatePayload = {
  [K in keyof CursoBasePayload]?: CursoBasePayload[K] | undefined;
};
export type CursoPersisted = Curso & { documentId?: string };
export type CursoUpdatePayload = {
  [K in keyof CriarCursoPayload]?: CriarCursoPayload[K] | undefined;
};

export function first<T>(data: T | T[] | undefined): T | undefined {
  return Array.isArray(data) ? data[0] : data;
}

function isMetadataRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeProgress(value: unknown): ProgressoItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): ProgressoItem[] => {
    if (typeof entry !== 'object' || entry === null) return [];
    const raw = entry as Record<string, unknown>;
    const itemId = raw.itemId;
    if (typeof itemId !== 'string' && typeof itemId !== 'number') return [];
    return [{
      itemId: String(itemId),
      concluido: raw.concluido === true,
      ...(typeof raw.dataConclusao === 'string' ? { dataConclusao: raw.dataConclusao } : {}),
      ...(isMetadataRecord(raw.metadata)
        ? { metadata: raw.metadata }
        : {}),
    }];
  });
}

export function persistedId(entity: { id: string | number; documentId?: string }): string {
  return entity.documentId ?? String(entity.id);
}

export function matchesId(entity: { id: string | number; documentId?: string }, id: string): boolean {
  return String(entity.id) === id || entity.documentId === id;
}

export function entityId(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  throw new Error('Identificador Strapi inválido');
}

function cursoIdentifierFilters(id: string): Record<string, string> {
  return {
    'filters[$or][0][documentId][$eq]': id,
    'filters[$or][1][slug][$eq]': id,
    ...(/^[0-9]+$/.test(id) ? { 'filters[$or][2][id][$eq]': id } : {}),
  };
}

export function toPublicModulo(modulo: ExistingModulo): Modulo {
  return {
    ...modulo,
    id: persistedId(modulo),
    itens: modulo.itens.map((item) => ({ ...item, id: persistedId(item) })),
  };
}

export async function resolveCursoDocumentId(id: string): Promise<string> {
  const res = await strapiGet<CursoComModulos>('/cursos', {
    ...cursoIdentifierFilters(id),
    'fields[0]': 'id',
    'fields[1]': 'documentId',
    'pagination[pageSize]': '1',
    status: 'draft',
  });
  const curso = first(res.data);
  if (!curso) throw Object.assign(new Error('Curso não encontrado'), { status: 404 });
  return curso.documentId ?? entityId(curso.id);
}

export async function resolveCursoReference(
  id: string,
  status?: StrapiPublicationStatus,
): Promise<CursoComModulos | undefined> {
  const res = await strapiGet<CursoComModulos>('/cursos', {
    ...cursoIdentifierFilters(id),
    populate: 'autor',
    'pagination[pageSize]': '1',
    status: status ?? 'draft',
  });
  return first(res.data);
}

export async function listarModulosCurso(
  cursoId: string,
  cursoDocumentId?: string,
): Promise<ExistingModulo[]> {
  const relationDocumentId = cursoDocumentId ?? cursoId;
  const cursoRelationFilters: Record<string, string> = {
    'filters[$or][0][curso][documentId][$eq]': relationDocumentId,
    ...(/^[0-9]+$/.test(cursoId) ? { 'filters[$or][1][curso][id][$eq]': cursoId } : {}),
  };
  const modulosRes = await strapiGet<Omit<ExistingModulo, 'itens'>>('/modulos', {
    ...cursoRelationFilters,
    sort: 'ordem:asc',
    'pagination[pageSize]': '100',
  });

  return Promise.all(modulosRes.data.map(async (modulo) => {
    const moduloId = entityId(modulo.id);
    const moduloDocumentId = modulo.documentId ?? moduloId;
    const moduloRelationFilters: Record<string, string> = {
      'filters[$or][0][modulo][documentId][$eq]': moduloDocumentId,
      ...(/^[0-9]+$/.test(moduloId) ? { 'filters[$or][1][modulo][id][$eq]': moduloId } : {}),
    };
    const itensRes = await strapiGet<ExistingModuloItem>('/modulo-items', {
      ...moduloRelationFilters,
      sort: 'ordem:asc',
      'pagination[pageSize]': '200',
    });
    return { ...modulo, itens: itensRes.data };
  }));
}

export async function syncCursoItems(
  moduloId: string,
  existingItems: ExistingModuloItem[],
  nextItems: CursoItemPayload[],
): Promise<void> {
  await Promise.all(existingItems
    .filter((item) => !nextItems.some((nextItem) =>
      nextItem.persistedId ? matchesId(item, nextItem.persistedId) : false))
    .map((item) => strapiDelete(`/modulo-items/${persistedId(item)}`)));

  for (const item of nextItems) {
    const body = {
      titulo: item.titulo,
      tipo: item.tipo,
      conteudo: item.conteudo,
      url: item.url,
      videoId: item.videoId,
      imagens: item.imagens,
      ordem: item.ordem,
      modulo: moduloId,
    };
    if (item.persistedId) {
      const existing = existingItems.find((candidate) => matchesId(candidate, item.persistedId ?? ''));
      if (!existing) throw new Error(`Item de módulo com id ${item.persistedId} não encontrado para atualização`);
      await strapiPut(`/modulo-items/${persistedId(existing)}`, body);
    } else {
      await strapiPost<unknown>('/modulo-items', body);
    }
  }
}

export function toCursoStrapiData(
  cursoData: CursoBasePayload | CursoBaseUpdatePayload,
): Record<string, unknown> {
  const { capaUrl, comissao: _comissao, requerValidacaoComite: _requerValidacaoComite, ...allowed } = cursoData;
  return { ...allowed, ...(capaUrl ? { thumbnailUrl: capaUrl } : {}) };
}
