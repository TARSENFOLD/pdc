import type {
  AtualizarCursoPayload,
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

interface ExistingModuloItemWithRelation extends ExistingModuloItem {
  modulo?: { id: string | number; documentId?: string };
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
export type CursoUpdatePayload = AtualizarCursoPayload;

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
    return [
      {
        itemId: String(itemId),
        concluido: raw.concluido === true,
        ...(typeof raw.dataConclusao === 'string' ? { dataConclusao: raw.dataConclusao } : {}),
        ...(isMetadataRecord(raw.metadata) ? { metadata: raw.metadata } : {}),
      },
    ];
  });
}

export function persistedId(entity: { id: string | number; documentId?: string }): string {
  return entity.documentId ?? String(entity.id);
}

export function matchesId(
  entity: { id: string | number; documentId?: string },
  id: string
): boolean {
  return String(entity.id) === id || entity.documentId === id;
}

export function entityId(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  throw new Error('Identificador Strapi inválido');
}

async function listAllStrapi<T>(
  path: string,
  params: Record<string, string | string[]>,
  pageSize: number
): Promise<(T & { id: string | number })[]> {
  const firstPage = await strapiGet<T>(path, {
    ...params,
    'pagination[page]': '1',
    'pagination[pageSize]': String(pageSize),
  });
  const data: (T & { id: string | number })[] = [...firstPage.data];
  const expectedTotal = firstPage.meta.pagination.total;
  if (data.length >= expectedTotal) return data;

  for (let page = 2; page <= firstPage.meta.pagination.pageCount; page += 1) {
    const response = await strapiGet<T>(path, {
      ...params,
      'pagination[page]': String(page),
      'pagination[pageSize]': String(pageSize),
    });
    data.push(...response.data);
    if (data.length >= expectedTotal) return data;
    if (response.data.length === 0) {
      throw new Error(
        `Resposta paginada incompleta do Strapi para ${path}: ${String(data.length)}/${String(expectedTotal)}`
      );
    }
  }

  throw new Error(
    `Resposta paginada incompleta do Strapi para ${path}: ${String(data.length)}/${String(expectedTotal)}`
  );
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
  status?: StrapiPublicationStatus
): Promise<CursoComModulos | undefined> {
  const res = await strapiGet<CursoComModulos>('/cursos', {
    ...cursoIdentifierFilters(id),
    populate: 'autor',
    'pagination[pageSize]': '1',
    status: status ?? 'draft',
  });
  return first(res.data);
}

export async function listarVersoesCursos(
  ids: string[]
): Promise<Map<string, { current?: CursoComModulos; published?: CursoComModulos }>> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return new Map();
  const numericIds = uniqueIds.filter((id) => /^[0-9]+$/.test(id));
  const filters: Record<string, string | string[]> = {
    'filters[$or][0][documentId][$in]': uniqueIds,
    ...(numericIds.length > 0 ? { 'filters[$or][1][id][$in]': numericIds } : {}),
    populate: 'autor',
    'pagination[pageSize]': String(uniqueIds.length),
  };
  const [currentResponse, publishedResponse] = await Promise.all([
    strapiGet<CursoComModulos>('/cursos', { ...filters, status: 'draft' }),
    strapiGet<CursoComModulos>('/cursos', { ...filters, status: 'published' }),
  ]);
  const currentByIdentity = new Map<string, CursoComModulos>();
  const publishedByIdentity = new Map<string, CursoComModulos>();
  for (const curso of currentResponse.data) {
    currentByIdentity.set(entityId(curso.id), curso);
    if (curso.documentId) currentByIdentity.set(curso.documentId, curso);
  }
  for (const curso of publishedResponse.data) {
    publishedByIdentity.set(entityId(curso.id), curso);
    if (curso.documentId) publishedByIdentity.set(curso.documentId, curso);
  }

  return new Map(
    uniqueIds.map((id) => {
      const current = currentByIdentity.get(id);
      const published = publishedByIdentity.get(id);
      return [
        id,
        {
          ...(current ? { current } : {}),
          ...(published ? { published } : {}),
        },
      ];
    })
  );
}

export async function listarModulosCurso(
  cursoId: string,
  cursoDocumentId?: string
): Promise<ExistingModulo[]> {
  const relationDocumentId = cursoDocumentId ?? cursoId;
  const cursoRelationFilters: Record<string, string> = {
    'filters[$or][0][curso][documentId][$eq]': relationDocumentId,
    ...(/^[0-9]+$/.test(cursoId) ? { 'filters[$or][1][curso][id][$eq]': cursoId } : {}),
  };
  const modulos = await listAllStrapi<Omit<ExistingModulo, 'itens'>>(
    '/modulos',
    {
      ...cursoRelationFilters,
      sort: 'ordem:asc',
    },
    100
  );
  if (modulos.length === 0) return [];

  const moduloDocumentIds = modulos.map((modulo) => modulo.documentId ?? entityId(modulo.id));
  const numericModuloIds = modulos
    .map((modulo) => entityId(modulo.id))
    .filter((id) => /^[0-9]+$/.test(id));
  const itemRelationFilters: Record<string, string | string[]> = {
    'filters[$or][0][modulo][documentId][$in]': moduloDocumentIds,
    ...(numericModuloIds.length > 0
      ? { 'filters[$or][1][modulo][id][$in]': numericModuloIds }
      : {}),
  };
  const itens = await listAllStrapi<ExistingModuloItemWithRelation>(
    '/modulo-items',
    {
      ...itemRelationFilters,
      populate: 'modulo',
      sort: 'ordem:asc',
    },
    1000
  );
  const moduleByIdentity = new Map<string, string>();
  const itemsByModule = new Map<string, ExistingModuloItem[]>();
  for (const modulo of modulos) {
    const key = modulo.documentId ?? entityId(modulo.id);
    moduleByIdentity.set(entityId(modulo.id), key);
    if (modulo.documentId) moduleByIdentity.set(modulo.documentId, key);
    itemsByModule.set(key, []);
  }
  for (const item of itens) {
    const relation = item.modulo;
    const fallbackKey = modulos.length === 1 ? moduloDocumentIds[0] : undefined;
    const moduleKey = relation
      ? ((relation.documentId ? moduleByIdentity.get(relation.documentId) : undefined) ??
        moduleByIdentity.get(entityId(relation.id)))
      : fallbackKey;
    if (!moduleKey) {
      throw new Error(`Item de módulo ${persistedId(item)} sem relação de módulo resolvível`);
    }
    const { modulo: _modulo, ...publicItem } = item;
    void _modulo;
    itemsByModule.get(moduleKey)?.push(publicItem);
  }

  return modulos.map((modulo) => {
    const key = modulo.documentId ?? entityId(modulo.id);
    return { ...modulo, itens: itemsByModule.get(key) ?? [] };
  });
}

export async function syncCursoItems(
  moduloId: string,
  existingItems: ExistingModuloItem[],
  nextItems: CursoItemPayload[]
): Promise<void> {
  await Promise.all(
    existingItems
      .filter(
        (item) =>
          !nextItems.some((nextItem) =>
            nextItem.persistedId ? matchesId(item, nextItem.persistedId) : false
          )
      )
      .map((item) => strapiDelete(`/modulo-items/${persistedId(item)}`))
  );

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
      const existing = existingItems.find((candidate) =>
        matchesId(candidate, item.persistedId ?? '')
      );
      if (!existing)
        throw new Error(
          `Item de módulo com id ${item.persistedId} não encontrado para atualização`
        );
      await strapiPut(`/modulo-items/${persistedId(existing)}`, body);
    } else {
      await strapiPost<unknown>('/modulo-items', body);
    }
  }
}

export function toCursoStrapiData(
  cursoData: CursoBasePayload | CursoBaseUpdatePayload
): Record<string, unknown> {
  const {
    capaUrl,
    comissao: _comissao,
    requerValidacaoComite: _requerValidacaoComite,
    ...allowed
  } = cursoData;
  return { ...allowed, ...(capaUrl ? { thumbnailUrl: capaUrl } : {}) };
}
