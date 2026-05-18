import { strapiDelete, strapiGet, strapiPost, strapiPut } from '../strapi/strapi.client.js';
import { Curso, Inscricao, Modulo, type CriarCursoPayload, type ItemModulo, type ProgressoItem } from '@pdc/shared';
import { eventBus } from '../events/event-bus.js';
import { DomainEventName } from '../events/types.js';
import pino from 'pino';

const log = pino({ name: 'cursos-service' });

interface StrapiPerfilRef {
  id: string | number;
}

interface ExistingModuloItem {
  id: string | number;
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
type CursoWithThumbnail = Curso & { thumbnailUrl?: string; documentId?: string };

function persistedId(entity: { id: string | number; documentId?: string }): string {
  return entity.documentId ?? String(entity.id);
}

function entityId(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  throw new Error('Identificador Strapi inválido');
}

async function resolveCursoDocumentId(id: string): Promise<string> {
  const res = await strapiGet<CursoComModulos>('/cursos', {
    'filters[id][$eq]': id,
    'fields[0]': 'id',
    'fields[1]': 'documentId',
    'pagination[pageSize]': '1',
  });
  const curso = first(res.data);
  if (!curso) throw Object.assign(new Error('Curso não encontrado'), { status: 404 });
  return curso.documentId ?? entityId(curso.id);
}

async function listarModulosCurso(cursoId: string): Promise<Modulo[]> {
  const modulosRes = await strapiGet<Omit<Modulo, 'itens'>>('/modulos', {
    'filters[curso][id][$eq]': cursoId,
    'sort': 'ordem:asc',
    'pagination[pageSize]': '100',
  });

  const modulos = await Promise.all(modulosRes.data.map(async (modulo) => {
    const itensRes = await strapiGet<ItemModulo>('/modulo-items', {
      'filters[modulo][id][$eq]': entityId(modulo.id),
      'sort': 'ordem:asc',
      'pagination[pageSize]': '200',
    });
    return { ...modulo, itens: itensRes.data };
  }));

  return modulos;
}

async function syncCursoItems(moduloId: string, existingItems: ExistingModuloItem[], nextItems: CursoItemPayload[]): Promise<void> {
  const nextIds = new Set(nextItems.flatMap((item) => item.persistedId ? [item.persistedId] : []));

  await Promise.all(existingItems
    .filter((item) => !nextIds.has(persistedId(item)))
    .map((item) => strapiDelete(`/modulo-items/${persistedId(item)}`)));

  for (const item of nextItems) {
    const body = {
      titulo: item.titulo,
      tipo: item.tipo,
      conteudo: item.conteudo,
      url: item.url,
      ordem: item.ordem,
      modulo: moduloId,
    };

    if (item.persistedId) {
      await strapiPut(`/modulo-items/${item.persistedId}`, body);
    } else {
      await strapiPost<unknown>('/modulo-items', body);
    }
  }
}

function toCursoStrapiData(cursoData: Partial<CursoBasePayload>): Record<string, unknown> {
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
    const res = await strapiGet<CursoWithThumbnail>('/cursos', {
      'filters[id][$eq]': id,
      populate: 'autor',
      'pagination[pageSize]': '1',
    });
    const curso = first(res.data);
    if (!curso) return undefined;
    const modulos = await listarModulosCurso(id);
    return {
      ...curso,
      capaUrl: curso.capaUrl ?? curso.thumbnailUrl,
      modulos,
    };
  },

  async criarCursoCompleto(payload: CriarCursoPayload, autorId: string, perfilId: string): Promise<Curso> {
    const { modulos, regrasAcesso, estado, ...cursoData } = payload;
    const initialState = estado === 'published' ? 'review' : (estado ?? 'draft');
    
    // 1. Criar o Curso Base no Strapi
    const res = await strapiPost<Curso>('/cursos', {
      ...toCursoStrapiData(cursoData),
      regrasAcesso,
      autorId,
      autor: perfilId,
      estado: initialState, 
      slug: payload.titulo.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
    });
    
    const cursoId = entityId(res.data.id);

    // 2. Criar Módulos e Itens em Cascata (Sovereign Cascading)
    if (modulos.length > 0) {
      for (const mod of modulos) {
        const modRes = await strapiPost<Modulo>('/modulos', {
          titulo: mod.titulo,
          ordem: mod.ordem,
          curso: cursoId
        });
        
        const moduloId = modRes.data.id;
        
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

  async atualizarCurso(id: string, payload: Partial<CriarCursoPayload>, autorId: string): Promise<Curso> {
    const { modulos, regrasAcesso, estado, ...cursoData } = payload;
    const cursoDocumentId = await resolveCursoDocumentId(id);
    const resPut = await strapiPut<Curso>(`/cursos/${cursoDocumentId}`, {
      ...toCursoStrapiData(cursoData),
      ...(regrasAcesso ? { regrasAcesso } : {}),
      ...(estado ? { estado } : {}),
    });

    if (modulos) {
      const cursoRes = await strapiGet<CursoComModulos>('/cursos', {
        'filters[id][$eq]': id,
        populate: 'modulos.itens',
        'pagination[pageSize]': '1',
      });
      const curso = first(cursoRes.data);
      const existingModules = curso?.modulos ?? [];
      const nextIds = new Set(modulos.flatMap((modulo) => modulo.persistedId ? [modulo.persistedId] : []));

      await Promise.all(existingModules
        .filter((modulo) => !nextIds.has(persistedId(modulo)))
        .map((modulo) => strapiDelete(`/modulos/${persistedId(modulo)}`)));

      for (const modulo of modulos) {
        const body = {
          titulo: modulo.titulo,
          ordem: modulo.ordem,
          curso: id,
        };

        if (modulo.persistedId) {
          await strapiPut(`/modulos/${modulo.persistedId}`, body);
          const existingModule = existingModules.find((item) => persistedId(item) === modulo.persistedId);
          await syncCursoItems(modulo.persistedId, existingModule?.itens ?? [], modulo.itens);
        } else {
          const modRes = await strapiPost<Modulo>('/modulos', body);
          await syncCursoItems(entityId(modRes.data.id), [], modulo.itens);
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
