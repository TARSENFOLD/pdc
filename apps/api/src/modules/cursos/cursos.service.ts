import { strapiPost, strapiPut } from '../strapi/strapi.client.js';
import { Curso, Inscricao, Modulo, type CriarCursoPayload } from '@pdc/shared';
import { eventBus } from '../events/event-bus.js';
import { DomainEventName } from '../events/types.js';
import pino from 'pino';

const log = pino({ name: 'cursos-service' });

export const cursosService = {
  async criarCursoCompleto(payload: CriarCursoPayload, autorId: string): Promise<Curso> {
    const { modulos, regrasAcesso, ...cursoData } = payload;
    
    // 1. Criar o Curso Base no Strapi
    const res = await strapiPost<Curso>('/cursos', {
      ...cursoData,
      regrasAcesso,
      autorId,
      estado: 'published', 
      slug: payload.titulo.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
    });
    
    const cursoId = res.data.id;

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
            ordem: item.ordem,
            modulo: moduloId
          });
        }
      }
    }

    // 3. CAMADA 5: IMPACTO NO ECOSSISTEMA
    await eventBus.publishWithOutbox(DomainEventName.CURSO_PUBLICADO, {
      cursoId,
      autorId,
      titulo: cursoData.titulo,
      area: cursoData.area,
      regrasAcesso
    });

    log.info({ cursoId, autorId }, 'Curso materializado com sucesso e impacto E2E disparado.');
    return res.data;
  },

  async atualizarCurso(id: string, payload: Partial<CriarCursoPayload>, autorId: string): Promise<Curso> {
    const resPut = await strapiPut<Curso>(`/cursos/${id}`, payload);
    await eventBus.publishWithOutbox(DomainEventName.CURSO_ATUALIZADO, {
      cursoId: id,
      autorId,
    });
    return resPut.data;
  },

  async alterarEstado(id: string, estado: string, autorId: string): Promise<void> {
    await strapiPut(`/cursos/${id}`, { estado });
    if (estado === 'archived') {
      await eventBus.publishWithOutbox(DomainEventName.CURSO_ARQUIVADO, {
        cursoId: id,
        autorId,
      });
    }
  },

  async inscreverEstudante(cursoId: string, estudanteId: string): Promise<Inscricao> {
    const res = await strapiPost<Inscricao>('/inscricoes', {
      cursoId,
      estudanteId,
      dataInscricao: new Date().toISOString(),
      concluido: false,
      progressoPercentagem: 0,
    });
    await eventBus.publishWithOutbox(DomainEventName.CURSO_INSCRICAO, {
      cursoId,
      estudanteId,
    });
    return res.data;
  }
};
