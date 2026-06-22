import type { Role } from '@pdc/shared';
import { writeAuditLog } from '../../middleware/audit.js';
import { strapiGet, strapiPut, strapiPutRaw } from '../strapi/strapi.client.js';

interface StrapiRecord {
  id: string | number;
  documentId?: string;
  [key: string]: unknown;
}

interface ExportedUserData {
  exportedAt: string;
  userId: string;
  perfil: StrapiRecord | null;
  consents: StrapiRecord[];
  perfilVocacional: StrapiRecord[];
  vinculos: StrapiRecord[];
  partilhas: StrapiRecord[];
}

interface ActorContext {
  userId: string;
  role: Role;
  ip?: string;
  userAgent?: string;
}

function persistedId(record: StrapiRecord): string {
  return record.documentId ?? String(record.id);
}

async function findPerfil(userId: string): Promise<StrapiRecord | null> {
  const res = await strapiGet<StrapiRecord>('/perfis', {
    'filters[userId][$eq]': userId,
    'pagination[pageSize]': '1',
    populate: '*',
  });
  return res.data[0] ?? null;
}

async function audit(input: ActorContext, accao: string, detalhes?: Record<string, unknown>): Promise<void> {
  await writeAuditLog({
    actor: { id: input.userId, role: input.role },
    accao,
    recurso: 'data-rights',
    ip: input.ip ?? 'unknown',
    ...(input.userAgent ? { userAgent: input.userAgent } : {}),
    ...(detalhes ? { detalhes } : {}),
  });
}

async function exportUserData(input: ActorContext): Promise<ExportedUserData> {
  const perfil = await findPerfil(input.userId);
  const perfilId = perfil ? String(perfil.id) : '';
  const [consents, perfilVocacional, vinculos, partilhas] = await Promise.all([
    perfilId ? strapiGet<StrapiRecord>('/consentimentos', {
      'filters[perfil][id][$eq]': perfilId,
      'pagination[pageSize]': '100',
    }) : { data: [] },
    perfilId ? strapiGet<StrapiRecord>('/perfil-vocacionais', {
      'filters[perfil][id][$eq]': perfilId,
      'pagination[pageSize]': '100',
      sort: 'createdAt:desc',
    }) : { data: [] },
    strapiGet<StrapiRecord>('/vinculos', {
      'filters[$or][0][solicitante][userId][$eq]': input.userId,
      'filters[$or][1][destinatario][userId][$eq]': input.userId,
      'pagination[pageSize]': '100',
      populate: 'solicitante,destinatario',
    }),
    strapiGet<StrapiRecord>('/partilhas', {
      'filters[actor][userId][$eq]': input.userId,
      'pagination[pageSize]': '100',
      populate: 'actor',
    }),
  ]);

  await audit(input, 'dados_exportados', { perfilId });
  return {
    exportedAt: new Date().toISOString(),
    userId: input.userId,
    perfil,
    consents: consents.data,
    perfilVocacional: perfilVocacional.data,
    vinculos: vinculos.data,
    partilhas: partilhas.data,
  };
}

async function revokeUserRelations(userId: string): Promise<number> {
  const vinculos = await strapiGet<StrapiRecord>('/vinculos', {
    'filters[$or][0][solicitante][userId][$eq]': userId,
    'filters[$or][1][destinatario][userId][$eq]': userId,
    'pagination[pageSize]': '100',
  });
  const revokedAt = new Date().toISOString();
  await Promise.all(vinculos.data.map((vinculo) => (
    strapiPut(`/vinculos/${persistedId(vinculo)}`, {
      status: 'rejeitado',
      resolvidoEm: revokedAt,
      dataTerminacao: revokedAt,
    })
  )));
  return vinculos.data.length;
}

async function revokeAccesses(input: ActorContext): Promise<{ revokedVinculos: number }> {
  const revokedVinculos = await revokeUserRelations(input.userId);
  await audit(input, 'acessos_revogados', { revokedVinculos });
  return { revokedVinculos };
}

async function deleteVocationalProfile(input: ActorContext): Promise<{ deletedSnapshots: number }> {
  const perfil = await findPerfil(input.userId);
  if (!perfil) {
    await audit(input, 'perfil_vocacional_apagado', { deletedSnapshots: 0 });
    return { deletedSnapshots: 0 };
  }

  const snapshots = await strapiGet<StrapiRecord>('/perfil-vocacionais', {
    'filters[perfil][id][$eq]': String(perfil.id),
    'pagination[pageSize]': '100',
  });
  await Promise.all(snapshots.data.map((snapshot) => (
    strapiPut(`/perfil-vocacionais/${persistedId(snapshot)}`, { atual: false })
  )));
  await audit(input, 'perfil_vocacional_apagado', { deletedSnapshots: snapshots.data.length });
  return { deletedSnapshots: snapshots.data.length };
}

async function softDeleteAndAnonymize(input: ActorContext): Promise<{ anonymized: true; perfilId?: string; revokedVinculos: number }> {
  const perfil = await findPerfil(input.userId);
  const anonymizedEmail = `anon-${input.userId}@anon.usepdc.local`;
  let perfilId: string | undefined;
  if (perfil) {
    perfilId = String(perfil.id);
    await strapiPut(`/perfis/${persistedId(perfil)}`, {
      nome: 'Utilizador anonimizado',
      email: anonymizedEmail,
      telefone: null,
      bio: null,
      headline: null,
      website: null,
      socialLinks: [],
      avatarUrl: null,
      bannerUrl: null,
      ativo: false,
      contaEstado: 'anonimizada',
      visibilitySettings: {
        email: 'privado',
        telefone: 'privado',
        miniFeed: 'privado',
        vinculos: 'privado',
        bio: 'privado',
        socialLinks: 'privado',
        areasInteresse: 'privado',
        competencias: 'privado',
        historicoProfissional: 'privado',
        formacaoAcademica: 'privado',
      },
      anonymizedAt: new Date().toISOString(),
    });
  }

  const revokedVinculos = await revokeUserRelations(input.userId);
  await strapiPutRaw(`/users/${input.userId}`, {
    email: anonymizedEmail,
    username: anonymizedEmail,
    confirmed: false,
    blocked: true,
  });
  await audit(input, 'conta_anonimizada', { perfilId, revokedVinculos });
  return { anonymized: true, ...(perfilId ? { perfilId } : {}), revokedVinculos };
}

export const dataRightsService = {
  deleteVocationalProfile,
  exportUserData,
  revokeAccesses,
  softDeleteAndAnonymize,
};
