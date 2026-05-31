import pino from 'pino';
import { z } from 'zod';
import { strapiGet, strapiPut } from '../strapi/strapi.client.js';
import { eventBus } from '../events/event-bus.js';
import { DomainEventName } from '../events/types.js';

const log = pino({ name: 'moderacao-service' });

export const ConteudoTipoSchema = z.enum(['curso', 'simulacao', 'experiencia', 'programa', 'projeto', 'feed-post']);
export type ConteudoTipo = z.infer<typeof ConteudoTipoSchema>;

const TIPO_COLECAO: Record<ConteudoTipo, string> = {
  curso: 'cursos',
  simulacao: 'simulacoes',
  experiencia: 'experiencias',
  programa: 'programas',
  projeto: 'projetos',
  'feed-post': 'feed-posts',
};

const RejeitarPayloadSchema = z.object({
  motivo: z.string().min(10).max(500),
});

interface StrapiConteudoItem {
  id: string | number;
  documentId?: string;
  titulo?: string;
  estado?: string;
  createdAt?: string;
  autor?: { nome?: string };
  autorId?: { nome?: string };
}

export interface ConteudoPendenteItem {
  id: string | number;
  titulo: string | undefined;
  autorNome: string;
  submittedAt: string | undefined;
  tipo: ConteudoTipo;
}

function colecao(tipo: ConteudoTipo): string {
  return TIPO_COLECAO[tipo];
}

function parsePositiveInt(value: string, fallback: number): number {
  if (!/^[1-9]\d*$/.test(value)) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const moderacaoService = {
  async listarPendentes(
    tipo: ConteudoTipo,
    page = '1',
    pageSize = '10',
  ): Promise<{ data: ConteudoPendenteItem[]; meta: { page: number; pageSize: number; total: number; pageCount: number } }> {
    const col = colecao(tipo);
    const pageNum = parsePositiveInt(page, 1);
    const pageSizeNum = parsePositiveInt(pageSize, 10);

    const itemsRes = await strapiGet<StrapiConteudoItem>(`/${col}`, {
      'filters[estado][$eq]': 'review',
      'pagination[page]': pageNum.toString(),
      'pagination[pageSize]': pageSizeNum.toString(),
      'fields': 'id,titulo,estado,createdAt',
      'populate': 'autor,autorId',
    });

    const data = itemsRes.data.map((item) => ({
      id: item.id,
      titulo: item.titulo,
      autorNome: item.autor?.nome ?? item.autorId?.nome ?? 'Desconhecido',
      submittedAt: item.createdAt,
      tipo,
    }));

    return {
      data,
      meta: {
        page: pageNum,
        pageSize: pageSizeNum,
        total: itemsRes.meta.pagination.total,
        pageCount: itemsRes.meta.pagination.pageCount,
      },
    };
  },

  async aprovarConteudo(tipo: ConteudoTipo, id: string, aprovadorUserId: string): Promise<{ eventId: string }> {
    const col = colecao(tipo);

    const res = await strapiGet<StrapiConteudoItem>(`/${col}`, {
      'filters[id][$eq]': id,
      'fields[0]': 'id',
      'fields[1]': 'documentId',
      'fields[2]': 'estado',
      'pagination[pageSize]': '1',
    });

    const item = res.data[0];
    if (!item) {
      throw Object.assign(new Error('Conteúdo não encontrado'), { status: 404 });
    }

    await strapiPut<unknown>(`/${col}/${String(item.documentId ?? item.id)}`, {
      estado: 'approved',
    });

    const event = await eventBus.publishWithOutbox(DomainEventName.MODERADOR_APROVOU, {
      targetType: tipo,
      targetId: id,
      moderadorId: aprovadorUserId,
    });

    log.info({ tipo, id, aprovadorUserId }, '[moderacao] conteúdo aprovado');
    return { eventId: event.id };
  },

  async rejeitarConteudo(
    tipo: ConteudoTipo,
    id: string,
    aprovadorUserId: string,
    motivo: string,
  ): Promise<{ eventId: string }> {
    RejeitarPayloadSchema.parse({ motivo });

    const col = colecao(tipo);

    const res = await strapiGet<StrapiConteudoItem>(`/${col}`, {
      'filters[id][$eq]': id,
      'fields[0]': 'id',
      'fields[1]': 'documentId',
      'fields[2]': 'estado',
      'pagination[pageSize]': '1',
    });

    const item = res.data[0];
    if (!item) {
      throw Object.assign(new Error('Conteúdo não encontrado'), { status: 404 });
    }

    await strapiPut<unknown>(`/${col}/${String(item.documentId ?? item.id)}`, {
      estado: 'draft',
      motivoRejeicao: motivo,
      rejeitadoEm: new Date().toISOString(),
      rejeitadoPor: aprovadorUserId,
    });

    const event = await eventBus.publishWithOutbox(DomainEventName.CONTEUDO_REJEITADO, {
      targetType: tipo,
      targetId: id,
      rejeitadorId: aprovadorUserId,
      motivo,
    });

    log.info({ tipo, id, aprovadorUserId }, '[moderacao] conteúdo rejeitado');
    return { eventId: event.id };
  },
};
