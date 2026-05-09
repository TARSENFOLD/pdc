import pino from 'pino';
import { z } from 'zod';
import { strapiGet, strapiPut } from '../strapi/strapi.client.js';
import { eventBus } from '../events/event-bus.js';
import { DomainEventName } from '../events/types.js';
import { redis } from '../../lib/redis.js';

export interface PerfilPendenteItem {
  id: number;
  userId: number;
  nome: string;
  tipo: 'mentor' | 'instituicao';
  email: string;
  createdAt: string;
  documentos?: Array<{ tipo: string; url: string }>;
  areaFormacao?: string;
  regiao?: string;
  tipoInstituicao?: string;
  natureza?: string;
}

const log = pino({ name: 'aprovacao-service' });

const CACHE_KEY_PREFIX = 'requireApproved:';

interface StrapiPerfilPendente {
  id: string | number;
  documentId?: string;
  userId?: string | number;
  nome?: string;
  tipo?: string;
  email?: string;
  createdAt?: string;
  documentos?: Array<{ tipo: string; url: string }>;
  areaFormacao?: string;
  regiao?: string;
  tipoInstituicao?: string;
  natureza?: string;
}

const RejeitarPayloadSchema = z.object({
  motivo: z.string().min(10).max(500),
});

export type RejeitarPayload = z.infer<typeof RejeitarPayloadSchema>;

async function invalidateApprovalCache(userId: string): Promise<void> {
  try {
    await redis.del(`${CACHE_KEY_PREFIX}${userId}`);
    log.info({ userId }, '[aprovacao] cache invalidado');
  } catch (err) {
    log.error({ err, userId }, '[aprovacao] falha ao invalidar cache');
  }
}

export const aprovacaoService = {
  async listarPendentes(tipo: 'mentor' | 'instituicao') {
    const res = await strapiGet<StrapiPerfilPendente>('/perfis', {
      'filters[tipo][$eq]': tipo,
      'filters[aprovado][$eq]': 'false',
      'pagination[pageSize]': '50',
      'populate': 'documentos',
    });

    return res.data.map((p) => ({
      id: typeof p.id === 'string' ? parseInt(p.id, 10) : (p.id as number),
      userId: typeof p.userId === 'string' ? parseInt(p.userId, 10) : ((p.userId ?? 0) as number),
      nome: p.nome ?? 'Sem nome',
      tipo: (p.tipo ?? tipo) as 'mentor' | 'instituicao',
      email: p.email ?? '',
      createdAt: p.createdAt ?? new Date().toISOString(),
      documentos: p.documentos ?? [],
      areaFormacao: p.areaFormacao,
      regiao: p.regiao,
      tipoInstituicao: p.tipoInstituicao,
      natureza: p.natureza,
    }));
  },

  async aprovarPerfil(perfilId: string, aprovadorUserId: string): Promise<{ eventId: string }> {
    const res = await strapiGet<StrapiPerfilPendente>('/perfis', {
      'filters[id][$eq]': perfilId,
      'fields[0]': 'id',
      'fields[1]': 'userId',
      'fields[2]': 'tipo',
      'pagination[pageSize]': '1',
    });

    const perfil = res.data[0];
    if (!perfil) {
      throw Object.assign(new Error('Perfil não encontrado'), { status: 404 });
    }

    await strapiPut<unknown>(`/perfis/${perfilId}`, {
      aprovado: true,
      aprovadoEm: new Date().toISOString(),
      aprovadoPor: aprovadorUserId,
    });

    const userId = String(perfil.userId ?? perfilId);
    await invalidateApprovalCache(userId);

    const event = await eventBus.publishWithOutbox(DomainEventName.PERFIL_APROVADO, {
      perfilId: String(perfil.id),
      aprovadorId: aprovadorUserId,
      role: perfil.tipo ?? 'mentor',
      userId,
    });

    log.info({ perfilId, aprovadorUserId }, '[aprovacao] perfil aprovado');
    return { eventId: event.id };
  },

  async rejeitarPerfil(perfilId: string, aprovadorUserId: string, motivo: string): Promise<{ eventId: string }> {
    RejeitarPayloadSchema.parse({ motivo });

    const res = await strapiGet<StrapiPerfilPendente>('/perfis', {
      'filters[id][$eq]': perfilId,
      'fields[0]': 'id',
      'fields[1]': 'userId',
      'fields[2]': 'tipo',
      'pagination[pageSize]': '1',
    });

    const perfil = res.data[0];
    if (!perfil) {
      throw Object.assign(new Error('Perfil não encontrado'), { status: 404 });
    }

    await strapiPut<unknown>(`/perfis/${perfilId}`, {
      aprovado: false,
      motivoRejeicao: motivo,
    });

    const userId = String(perfil.userId ?? perfilId);
    await invalidateApprovalCache(userId);

    const event = await eventBus.publishWithOutbox(DomainEventName.PERFIL_REJEITADO, {
      perfilId: String(perfil.id),
      rejeitadorId: aprovadorUserId,
      motivo,
      role: perfil.tipo ?? 'mentor',
      userId,
    });

    log.info({ perfilId, aprovadorUserId }, '[aprovacao] perfil rejeitado');
    return { eventId: event.id };
  },
};
