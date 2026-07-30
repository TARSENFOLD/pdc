import { strapiDelete, strapiGet, strapiPost, strapiPut } from '../strapi/strapi.client.js';
import { Curso, Inscricao, Modulo, type CriarCursoPayload, type ItemModulo, type ProgressoItem } from '@pdc/shared';
import { eventBus } from '../events/event-bus.js';
import { DomainEventName } from '../events/types.js';
import pino from 'pino';

const log = pino({ name: 'cursos-service' });

interface StrapiPerfilRef {
  id: string | number;
}

interface ExistingModuloItem extends ItemModulo {
  documentId?: string;
}

interface ExistingModulo extends Omit<Modulo, 'itens'> {
  documentId?: string;
  itens: ExistingModuloItem[];
}

interface CursoComModulos extends Omit<Curso, 'modulos'> {
  documentId?: string;
  modulos?: ExistingModulo[];
}

interface InscricaoStrapi extends Inscricao {
  documentId?: string;
  modulosConcluidos?: unknown;
}

function first<T>(data: T | T[] | undefined): T | undefined {
  return Array.isArray(data) ? data[0] : data;
}

function normalizeProgress(value: unknown): ProgressoItem[] {
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
      ...(typeof raw.metadata === 'object' && raw.metadata !== null ? { metadata: raw.metadata as Record<string, unknown> } : {}),
    }];
  });
}

type CursoModuloPayload = CriarCursoPayload['modulos'][number];
type CursoItemPayload = CursoModuloPayload['itens'][number];
type CursoBasePayload = Omit<CriarCursoPayload, 'modulos' | 'regrasAcesso' | 'estado'>;
type CursoBaseUpdatePayload = {
  [K in keyof CursoBasePayload]?: CursoBasePayload[K] | undefined;
};
type CursoWithThumbnail = Curso & { thumbnailUrl?: string; documentId?: string };
type CursoPersisted = Curso & { documentId?: string };
type CursoUpdatePayload = {
  [K in keyof CriarCursoPayload]?: CriarCursoPayload[K] | undefined;
};

function persistedId(entity: { id: string | number; documentId?: string }): string {
  return entity.documentId ?? String(entity.id);
}

function matchesId(entity: { id: string | number; documentId?: string }, id: string): boolean {
  return String(entity.id) === id || entity.documentId === id;
}

function entityId(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  throw new Error('Identificador Strapi inválido');
}

function toPublicModulo(modulo: ExistingModulo): Modulo {
  return {
    ...modulo,
    id: persistedId(modulo),
    itens: modulo.itens.map((item) => ({
      ...item,
      id: persistedId(item),
    })),
  };
}

async function resolveCursoDocumentId(id: string): Promise<string> {
  const res = await strapiGet<CursoComModulos>('/cursos', {
    'filters[$or][0][documentId][$eq]': id,
    'filters[$or][1][id][$eq]': id,
    'fields[0]': 'id',
    'fields[1]': 'documentId',
    'pagination[pageSize]': '1',
  });
  const curso = first(res.data);
  if (!curso) throw Object.assign(new Error('Curso não encontrado'), { status: 404 });
  return curso.documentId ?? entityId(curso.id);
}

async function resolveCursoReference(id: string): Promise<CursoComModulos | undefined> {
  const res = await strapiGet<CursoComModulos>('/cursos', {
    'filters[$or][0][documentId][$eq]': id,
    'filters[$or][1][id][$eq]': id,
    populate: 'autor',
    'pagination[pageSize]': '1',
  });
  return first(res.data);
}

async function listarModulosCurso(cursoId: string, cursoDocumentId?: string): Promise<ExistingModulo[]> {
  const relationDocumentId = cursoDocumentId ?? cursoId;
  const modulosRes = await strapiGet<Omit<ExistingModulo, 'itens'>>('/modulos', {
    'filters[$or][0][curso][documentId][$eq]': relationDocumentId,
    'filters[$or][1][curso][id][$eq]': cursoId,
    'sort': 'ordem:asc',
    'pagination[pageSize]': '100',
  });

  const modulos = await Promise.all(modulosRes.data.map(async (modulo) => {
    const moduloId = entityId(modulo.id);
    const moduloDocumentId = modulo.documentId ?? moduloId;
    const itensRes = await strapiGet<ExistingModuloItem>('/modulo-items', {
      'filters[$or][0][modulo][documentId][$eq]': moduloDocumentId,
      'filters[$or][1][modulo][id][$eq]': moduloId,
      'sort': 'ordem:asc',
      'pagination[pageSize]': '200',
    });
    return { ...modulo, itens: itensRes.data };
  }));

  return modulos;
}

async function syncCursoItems(moduloId: string, existingItems: ExistingModuloItem[], nextItems: CursoItemPayload[]): Promise<void> {
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
      ordem: item.ordem,
      modulo: moduloId,
    };

    if (item.persistedId) {
      const existingItem = existingItems.find((candidate) => matchesId(candidate, item.persistedId ?? ''));
      if (!existingItem) {
        throw new Error(`Item de módulo com id ${item.persistedId} não encontrado para atualização`);
      }
      await strapiPut(`/modulo-items/${persistedId(existingItem)}`, body);
    } else {
      await strapiPost<unknown>('/modulo-items', body);
    }
  }
}

function toCursoStrapiData(
  cursoData: CursoBasePayload | CursoBaseUpdatePayload,
): Record<string, unknown> {
  const {
    capaUrl,
    comissao: _comissao,
    requerValidacaoComite: _requerValidacaoComite,
    ...allowedData
  } = cursoData;

  return {
    ...allowedData,
    ...(capaUrl ? { thumbnailUrl: capaUrl } : {}),
  };
}

export const cursosService = {
  async obterCursoBase(id: string): Promise<CursoComModulos | undefined> {
    return resolveCursoReference(id);
  },

  async resolvePerfilId(userId: string, jwtPerfilId?: string): Promise<string> {
    if (jwtPerfilId) return jwtPerfilId;
    const resPerfil = await strapiGet<StrapiPerfilRef>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
      'pagination[pageSize]': '1',
    });
    const perfilId = first(resPerfil.data)?.id;
    if (!perfilId) throw Object.assign(new Error('Perfil não encontrado'), { status: 404 });
    return String(perfilId);
  },

  async obterCursoComModulos(id: string): Promise<Curso | undefined> {
    const curso = await resolveCursoReference(id) as CursoWithThumbnail | undefined;
    if (!curso) return undefined;
    const modulos = await listarModulosCurso(entityId(curso.id), curso.documentId);
    return {
      ...curso,
      capaUrl: curso.capaUrl ?? curso.thumbnailUrl,
      modulos: modulos.map(toPublicModulo),
    };
  },

  async criarCursoCompleto(payload: CriarCursoPayload, autorId: string, perfilId: string): Promise<Curso> {
    const { modulos, regrasAcesso, estado, ...cursoData } = payload;
    const initialState = estado === 'published' ? 'review' : (estado ?? 'draft');
    
    // 1. Criar o Curso Base no Strapi
    const res = await strapiPost<CursoPersisted>('/cursos', {
      ...toCursoStrapiData(cursoData),
      regrasAcesso,
      autorId,
      autor: perfilId,
      estado: initialState, 
      slug: payload.titulo.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
    });
    
    const cursoId = entityId(res.data.id);
    const cursoDocumentId = persistedId(res.data);

    // 2. Criar Módulos e Itens em Cascata (Sovereign Cascading)
    if (modulos.length > 0) {
      for (const mod of modulos) {
        const modRes = await strapiPost<ExistingModulo>('/modulos', {
          titulo: mod.titulo,
          ordem: mod.ordem,
          curso: cursoDocumentId,
        });
        
        const moduloId = persistedId(modRes.data);
        
        for (const item of mod.itens) {
          await strapiPost<unknown>('/modulo-items', {
            titulo: item.titulo,
            tipo: item.tipo,
            conteudo: item.conteudo,
            url: item.url,
            ordem: item.ordem,
            modulo: moduloId
          });
        }
      }
    }

    if (initialState === 'review') {
      await eventBus.publishWithOutbox(DomainEventName.CURSO_SUBMETIDO_COMITE, {
        cursoId,
        autorId,
      });
    }

    log.info({ cursoId, autorId, estado: initialState }, 'Curso materializado com sucesso.');
    return res.data;
  },

  async atualizarCurso(id: string, payload: CursoUpdatePayload, autorId: string): Promise<Curso> {
    const { modulos, regrasAcesso, estado, ...cursoData } = payload;
    const cursoDocumentId = await resolveCursoDocumentId(id);
    const resPut = await strapiPut<Curso>(`/cursos/${cursoDocumentId}`, {
      ...toCursoStrapiData(cursoData),
      ...(regrasAcesso ? { regrasAcesso } : {}),
      ...(estado ? { estado } : {}),
    });

    if (modulos) {
      const existingModules = await listarModulosCurso(id, cursoDocumentId);

      await Promise.all(existingModules
        .filter((modulo) => !modulos.some((nextModulo) =>
          nextModulo.persistedId ? matchesId(modulo, nextModulo.persistedId) : false))
        .map((modulo) => strapiDelete(`/modulos/${persistedId(modulo)}`)));

      for (const modulo of modulos) {
        const body = {
          titulo: modulo.titulo,
          ordem: modulo.ordem,
          curso: cursoDocumentId,
        };

        if (modulo.persistedId) {
          const existingModule = existingModules.find((item) => matchesId(item, modulo.persistedId ?? ''));
          if (!existingModule) {
            throw new Error(`Módulo com id ${modulo.persistedId} não encontrado para atualização`);
          }
          const moduloDocumentId = persistedId(existingModule);
          await strapiPut(`/modulos/${moduloDocumentId}`, body);
          await syncCursoItems(moduloDocumentId, existingModule.itens, modulo.itens);
        } else {
          const modRes = await strapiPost<ExistingModulo>('/modulos', body);
          await syncCursoItems(persistedId(modRes.data), [], modulo.itens);
        }
      }
    }

    await eventBus.publishWithOutbox(DomainEventName.CURSO_ATUALIZADO, {
      cursoId: id,
      autorId,
    });
    return resPut.data;
  },

  async alterarEstado(id: string, estado: string, autorId: string, curso?: Curso): Promise<void> {
    const cursoDocumentId = await resolveCursoDocumentId(id);
    await strapiPut(`/cursos/${cursoDocumentId}`, { estado });
    if (estado === 'published') {
      await eventBus.publishWithOutbox(DomainEventName.CURSO_PUBLICADO, {
        cursoId: id,
        autorId,
        titulo: curso?.titulo ?? '',
        area: curso?.area,
        regrasAcesso: curso?.regrasAcesso,
      });
    }
    if (estado === 'archived') {
      await eventBus.publishWithOutbox(DomainEventName.CURSO_ARQUIVADO, {
        cursoId: id,
        autorId,
      });
    }
  },

  async buscarInscricao(cursoId: string, perfilId: string): Promise<InscricaoStrapi | undefined> {
    const res = await strapiGet<InscricaoStrapi>('/inscricoes', {
      'filters[perfil][id][$eq]': perfilId,
      'filters[curso][id][$eq]': cursoId,
      'populate': 'curso,perfil',
      'pagination[pageSize]': '1',
    });
    return first(res.data);
  },

  async inscreverUtilizador(cursoId: string, userId: string, perfilId: string, role: string): Promise<Inscricao> {
    const existing = await this.buscarInscricao(cursoId, perfilId);
    if (existing) return existing;

    const res = await strapiPost<Inscricao>('/inscricoes', {
      curso: cursoId,
      perfil: perfilId,
      role: role === 'mentor' ? 'mentor' : 'aluno',
      dataInscricao: new Date().toISOString().slice(0, 10),
      progressoPercentual: 0,
      modulosConcluidos: [],
    });
    await eventBus.publishWithOutbox(DomainEventName.CURSO_INSCRICAO, {
      cursoId,
      estudanteId: userId,
    });
    return res.data;
  },

  async listarProgresso(cursoId: string, perfilId: string): Promise<ProgressoItem[] | null> {
    const inscricao = await this.buscarInscricao(cursoId, perfilId);
    if (!inscricao) return null;
    return normalizeProgress(inscricao.modulosConcluidos);
  },

  async marcarItem(cursoId: string, itemId: string, perfilId: string, userId: string, concluido: boolean): Promise<ProgressoItem> {
    const inscricao = await this.buscarInscricao(cursoId, perfilId);
    if (!inscricao) throw Object.assign(new Error('Inscrição não encontrada'), { status: 403 });

    const current = normalizeProgress(inscricao.modulosConcluidos);
    const now = new Date().toISOString();
    const nextItem: ProgressoItem = concluido
      ? { itemId, concluido: true, dataConclusao: now }
      : { itemId, concluido: false };
    const next = [...current.filter((item) => item.itemId !== itemId), nextItem];

    const modulos = await listarModulosCurso(cursoId);
    const totalItems = modulos.reduce((total, modulo) => total + modulo.itens.length, 0);
    const completedItems = next.filter((item) => item.concluido).length;
    const progressoPercentual = totalItems > 0 ? Math.min(100, Math.round((completedItems / totalItems) * 100)) : 0;
    const inscricaoId = inscricao.documentId ?? inscricao.id;

    await strapiPut(`/inscricoes/${inscricaoId}`, {
      modulosConcluidos: next,
      progressoPercentual,
      ultimaAtividadeEm: now,
      ...(progressoPercentual === 100 ? { concluidoEm: now } : {}),
    });

    if (concluido) {
      await eventBus.publishWithOutbox(DomainEventName.CURSO_ITEM_CONCLUIDO, {
        cursoId,
        itemId,
        estudanteId: userId,
      });
      if (progressoPercentual === 100) {
        await eventBus.publishWithOutbox(DomainEventName.CURSO_CONCLUIDO, {
          cursoId,
          estudanteId: userId,
        });
      }
    }

    return nextItem;
  },
};
