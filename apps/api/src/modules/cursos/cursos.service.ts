import { strapiDelete, strapiGet, strapiPost, strapiPut } from '../strapi/strapi.client.js';
import {
  Curso,
  Inscricao,
  type CriarCursoPayload,
  type ProgressoItem,
  type StrapiPublicationStatus,
} from '@pdc/shared';
import { eventBus } from '../events/event-bus.js';
import { DomainEventName } from '../events/types.js';
import pino from 'pino';
import {
  contentRelationIdentityFilters,
  loadContentVersions,
} from '../conteudo/content-access.repository.js';
import {
  entityId,
  first,
  listarModulosCurso,
  matchesId,
  normalizeProgress,
  persistedId,
  resolveCursoDocumentId,
  resolveCursoReference,
  syncCursoItems,
  toCursoStrapiData,
  toPublicModulo,
  type CursoComModulos,
  type CursoPersisted,
  type CursoUpdatePayload,
  type ExistingModulo,
  type InscricaoStrapi,
} from './cursos.repository.js';

const log = pino({ name: 'cursos-service' });

interface StrapiPerfilRef {
  id: string | number;
}

export const cursosService = {
  async obterCursoBase(
    id: string,
    status?: StrapiPublicationStatus
  ): Promise<CursoComModulos | undefined> {
    return resolveCursoReference(id, status);
  },

  async obterVersoesCurso(id: string) {
    return loadContentVersions((status) => resolveCursoReference(id, status));
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

  async obterCursoComModulos(
    id: string,
    status?: StrapiPublicationStatus
  ): Promise<Curso | undefined> {
    const curso = await resolveCursoReference(id, status);
    if (!curso) return undefined;
    const modulos = await listarModulosCurso(entityId(curso.id), curso.documentId);
    return {
      ...curso,
      capaUrl: curso.capaUrl ?? curso.thumbnailUrl,
      modulos: modulos.map(toPublicModulo),
    };
  },

  async criarCursoCompleto(
    payload: CriarCursoPayload,
    autorId: string,
    perfilId: string
  ): Promise<Curso> {
    const { modulos, regrasAcesso, estado, ...cursoData } = payload;
    const initialState = estado === 'published' ? 'review' : (estado ?? 'draft');

    // 1. Criar o Curso Base no Strapi
    const res = await strapiPost<CursoPersisted>(
      '/cursos',
      {
        ...toCursoStrapiData(cursoData),
        regrasAcesso,
        autorId,
        autor: perfilId,
        estado: initialState,
        slug: payload.titulo
          .toLowerCase()
          .replace(/ /g, '-')
          .replace(/[^\w-]+/g, ''),
      },
      { status: 'draft' }
    );

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
            videoId: item.videoId,
            imagens: item.imagens,
            ordem: item.ordem,
            modulo: moduloId,
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
    const resPut = await strapiPut<Curso>(
      `/cursos/${cursoDocumentId}`,
      {
        ...toCursoStrapiData(cursoData),
        ...(regrasAcesso ? { regrasAcesso } : {}),
        ...(estado ? { estado } : {}),
      },
      { status: 'draft' }
    );

    if (modulos) {
      const existingModules = await listarModulosCurso(id, cursoDocumentId);

      await Promise.all(
        existingModules
          .filter(
            (modulo) =>
              !modulos.some((nextModulo) =>
                nextModulo.persistedId ? matchesId(modulo, nextModulo.persistedId) : false
              )
          )
          .map((modulo) => strapiDelete(`/modulos/${persistedId(modulo)}`))
      );

      for (const modulo of modulos) {
        const body = {
          titulo: modulo.titulo,
          ordem: modulo.ordem,
          curso: cursoDocumentId,
        };

        if (modulo.persistedId) {
          const existingModule = existingModules.find((item) =>
            matchesId(item, modulo.persistedId ?? '')
          );
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
    if (estado === 'published') {
      const currentDraft = await resolveCursoReference(id, 'draft');
      if (!currentDraft) throw Object.assign(new Error('Curso não encontrado'), { status: 404 });
      const cursoDocumentId = persistedId(currentDraft);
      const previousDraftState = currentDraft.estado;
      // Public access is governed by two independent dimensions during D-02:
      // the immutable Strapi snapshot must be published and remain editorially approved,
      // while the current draft records that the creator completed the publish action.
      await strapiPut(`/cursos/${cursoDocumentId}`, { estado: 'published' }, { status: 'draft' });
      try {
        await strapiPut(
          `/cursos/${cursoDocumentId}`,
          { estado: 'approved' },
          { status: 'published' }
        );
      } catch (publishError) {
        try {
          await strapiPut(
            `/cursos/${cursoDocumentId}`,
            { estado: previousDraftState },
            { status: 'draft' }
          );
        } catch (compensationError) {
          log.error(
            {
              compensationError,
              publishError,
              cursoId: id,
              previousDraftState,
            },
            'Falha crítica ao compensar transição de publicação do curso'
          );
          throw new AggregateError(
            [publishError, compensationError],
            'Publicação falhou e o estado editorial precisa de reconciliação.'
          );
        }
        throw publishError;
      }
      await eventBus.publishWithOutbox(DomainEventName.CURSO_PUBLICADO, {
        cursoId: id,
        autorId,
        titulo: curso?.titulo ?? '',
        area: curso?.area,
        regrasAcesso: curso?.regrasAcesso,
      });
    } else if (estado === 'archived') {
      const currentDraft = await resolveCursoReference(id, 'draft');
      if (!currentDraft) throw Object.assign(new Error('Curso não encontrado'), { status: 404 });
      const cursoDocumentId = persistedId(currentDraft);
      const previousDraftState = currentDraft.estado;
      await strapiPut(`/cursos/${cursoDocumentId}`, { estado: 'archived' }, { status: 'draft' });
      try {
        await strapiPut(
          `/cursos/${cursoDocumentId}`,
          { estado: 'archived' },
          { status: 'published' }
        );
      } catch (archiveError) {
        try {
          await strapiPut(
            `/cursos/${cursoDocumentId}`,
            { estado: previousDraftState },
            { status: 'draft' }
          );
        } catch (compensationError) {
          log.error(
            {
              compensationError,
              archiveError,
              cursoId: id,
              previousDraftState,
            },
            'Falha crítica ao compensar arquivamento do curso'
          );
          throw new AggregateError(
            [archiveError, compensationError],
            'Arquivamento falhou e o estado editorial precisa de reconciliação.'
          );
        }
        throw archiveError;
      }
    } else {
      const cursoDocumentId = await resolveCursoDocumentId(id);
      await strapiPut(`/cursos/${cursoDocumentId}`, { estado }, { status: 'draft' });
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
      ...contentRelationIdentityFilters('curso', cursoId),
      populate: 'curso,perfil',
      'pagination[pageSize]': '1',
    });
    return first(res.data);
  },

  async inscreverUtilizador(
    cursoId: string,
    userId: string,
    perfilId: string,
    role: string
  ): Promise<Inscricao> {
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

  async marcarItem(
    cursoId: string,
    itemId: string,
    perfilId: string,
    userId: string,
    concluido: boolean
  ): Promise<ProgressoItem> {
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
    const progressoPercentual =
      totalItems > 0 ? Math.min(100, Math.round((completedItems / totalItems) * 100)) : 0;
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
