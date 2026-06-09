import { strapiGet, strapiPut } from '../strapi/strapi.client.js';
import { eventBus } from '../events/event-bus.js';
import { DomainEventName } from '../events/types.js';
import { mapPrivada, mapPublica } from './instituicao.mapper.js';
import { persistedId, type StrapiInstituicao, type StrapiPerfilGestor } from './instituicao.types.js';
import { redis } from '../../lib/redis.js';
import crypto from 'node:crypto';

const POPULATE = [
  'enderecoEstruturado', 'contactosInstitucionais', 'acreditacoes',
  'politicas', 'documentosLegais',
];

async function findManaged(userId: string): Promise<StrapiInstituicao> {
  const res = await strapiGet<StrapiPerfilGestor>('/perfis', {
    'filters[userId][$eq]': userId,
    'populate[instituicaoGerida]': '*',
    'pagination[pageSize]': '1',
  });
  const instituicao = res.data[0]?.instituicaoGerida;
  if (!instituicao) throw Object.assign(new Error('Instituição associada não encontrada'), { status: 404 });
  return instituicao;
}

async function reload(id: string): Promise<StrapiInstituicao> {
  const res = await strapiGet<StrapiInstituicao>('/instituicoes', {
    'filters[$or][0][id][$eq]': id,
    'filters[$or][1][documentId][$eq]': id,
    ...Object.fromEntries(POPULATE.map((value, index) => [`populate[${String(index)}]`, value])),
    'pagination[pageSize]': '1',
  });
  const item = res.data[0];
  if (!item) throw Object.assign(new Error('Instituição não encontrada'), { status: 404 });
  return item;
}

async function update(userId: string, section: string, data: Record<string, unknown>) {
  const current = await findManaged(userId);
  if (current.estado === 'pending_review' || current.estado === 'suspended') {
    throw Object.assign(new Error('Instituição não pode ser editada neste estado'), { status: 409 });
  }
  await strapiPut(`/instituicoes/${persistedId(current)}`, data);
  await eventBus.publishWithOutbox(DomainEventName.INSTITUICAO_ATUALIZADA, {
    instituicaoId: String(current.id), userId, seccao: section,
  });
  return mapPrivada(await reload(String(current.id)));
}

export const instituicaoService = {
  async minha(userId: string) {
    const item = await findManaged(userId);
    return mapPrivada(await reload(String(item.id)));
  },
  update,
  async appendDocumento(userId: string, documento: Record<string, unknown>) {
    const lockKey = `instituicao:documento:${userId}`;
    const acquired = await redis.set(lockKey, crypto.randomUUID(), { nx: true, ex: 15 });
    if (!acquired) throw Object.assign(new Error('Upload concorrente; tenta novamente'), { status: 409 });
    try {
      const managed = await findManaged(userId);
      const atual = await reload(String(managed.id));
      return await update(userId, 'documentos', {
        documentosLegais: [...(atual.documentosLegais ?? []), documento],
      });
    } finally {
      await redis.del(lockKey);
    }
  },
  async submeter(userId: string) {
    const current = await findManaged(userId);
    const full = await reload(String(current.id));
    if (full.estado !== 'draft' && full.estado !== 'changes_requested') {
      throw Object.assign(
        new Error('Só é possível submeter um rascunho ou alterações solicitadas'),
        { status: 409 },
      );
    }
    const privada = mapPrivada(full);
    if (
      privada.completude < 75 ||
      !privada.identidade.nif ||
      !privada.localizacao ||
      !privada.contactos?.contactos.length ||
      !privada.documentos.length
    ) {
      throw Object.assign(new Error('Preenche identidade, localização, contacto e documentos antes de submeter'), { status: 422 });
    }
    await strapiPut(`/instituicoes/${persistedId(current)}`, {
      estado: 'pending_review', submetidaEm: new Date().toISOString(), motivoAlteracoes: null,
    });
    await eventBus.publishWithOutbox(DomainEventName.INSTITUICAO_SUBMETIDA, {
      instituicaoId: String(current.id), userId,
    });
    return mapPrivada(await reload(String(current.id)));
  },
  async moderar(id: string, adminId: string, estado: 'verified' | 'changes_requested' | 'suspended', motivo?: string) {
    if (estado !== 'verified' && !motivo) {
      throw Object.assign(new Error('Motivo obrigatório para alterações ou suspensão'), { status: 400 });
    }
    const current = await reload(id);
    await strapiPut(`/instituicoes/${persistedId(current)}`, {
      estado,
      aprovada: estado === 'verified',
      verificadaEm: estado === 'verified' ? new Date().toISOString() : null,
      motivoAlteracoes: motivo ?? null,
    });
    const eventName = estado === 'verified'
      ? DomainEventName.INSTITUICAO_VERIFICADA
      : DomainEventName.INSTITUICAO_ALTERACOES_SOLICITADAS;
    await eventBus.publishWithOutbox(eventName, estado === 'verified'
      ? { instituicaoId: String(current.id), aprovadorId: adminId }
      : { instituicaoId: String(current.id), aprovadorId: adminId, motivo });
    return mapPrivada(await reload(String(current.id)));
  },
  mapPublica,
};
