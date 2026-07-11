import { strapiDelete, strapiGet, strapiPost, strapiPut } from '../strapi/strapi.client.js';
import { persistedId, type StrapiInstituicao, type StrapiPerfilGestor } from './instituicao.types.js';
import crypto from 'node:crypto';

function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export type InstituicaoReference = Pick<StrapiInstituicao, 'id' | 'nome'> & {
  documentId?: string;
};

export interface ProvisionInstituicaoResult {
  instituicao: InstituicaoReference;
  created: boolean;
}

function instituicaoReference(instituicao: StrapiInstituicao): InstituicaoReference {
  return {
    id: instituicao.id,
    ...(instituicao.documentId ? { documentId: instituicao.documentId } : {}),
    nome: instituicao.nome,
  };
}

export async function provisionInstituicaoForUser(
  userId: string,
  input: { nome: string; nomeLegal?: string; tipo?: string; natureza?: string; regiao?: string; nif?: string },
): Promise<ProvisionInstituicaoResult> {
  const perfis = await strapiGet<StrapiPerfilGestor>('/perfis', {
    'filters[userId][$eq]': userId,
    'populate[instituicaoGerida][fields][0]': 'id',
    'populate[instituicaoGerida][fields][1]': 'documentId',
    'populate[instituicaoGerida][fields][2]': 'nome',
    'pagination[pageSize]': '1',
  });
  const perfil = perfis.data[0];
  if (!perfil) throw Object.assign(new Error('Perfil institucional não encontrado'), { status: 404 });
  if (perfil.instituicaoGerida) {
    return { instituicao: instituicaoReference(perfil.instituicaoGerida), created: false };
  }

  const baseSlug = slugify(input.nome) || `instituicao-${userId}`;
  const slug = `${baseSlug}-${userId}-${crypto.randomUUID().slice(0, 8)}`;
  const created = await strapiPost<StrapiInstituicao>('/instituicoes', {
    nome: input.nome,
    nomeLegal: input.nomeLegal ?? input.nome,
    slug,
    tipo: input.tipo ?? 'outro',
    natureza: input.natureza,
    regiao: input.regiao,
    nif: input.nif,
    estado: 'draft',
    aprovada: false,
    documentosLegais: [],
    branding: {},
  });
  const instituicao = created.data;
  try {
    await strapiPut(`/perfis/${persistedId(perfil)}`, { instituicaoGerida: instituicao.id });
  } catch (error) {
    let rollbackError: unknown;
    try {
      await strapiDelete(`/instituicoes/${persistedId(instituicao)}`);
    } catch (caught) {
      rollbackError = caught;
    }
    throw Object.assign(new Error('Instituição criada, mas ligação ao gestor pendente de retry'), {
      status: 503,
      retryable: true,
      instituicaoId: instituicao.id,
      cause: error,
      ...(rollbackError ? { rollbackError } : {}),
    });
  }
  return { instituicao: instituicaoReference(instituicao), created: true };
}
