import type { Role } from '@pdc/shared';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import type { StrapiProgramaRecord } from './programas.mapper.js';

interface StrapiRelation {
  id: string | number;
  documentId?: string;
}

interface ProgramaActor {
  userId: string;
  role: Role;
  perfil: StrapiRelation;
  instituicao?: StrapiRelation;
}

export async function resolveProgramaActor(
  user: { id: string; role: Role },
): Promise<ProgramaActor | null> {
  if (!user.id || user.id.trim() === '') return null;
  const response = await strapiGet<StrapiRelation & {
    instituicaoGerida?: StrapiRelation | null;
  }>('/perfis', {
    'filters[userId][$eq]': user.id,
    'populate[instituicaoGerida][fields][0]': 'id',
    'populate[instituicaoGerida][fields][1]': 'documentId',
    'pagination[pageSize]': '1',
  });
  const perfil = response.data[0];
  if (!perfil) return null;
  return {
    userId: user.id,
    role: user.role,
    perfil,
    ...(perfil.instituicaoGerida ? { instituicao: perfil.instituicaoGerida } : {}),
  };
}

export function relationId(relation: StrapiRelation): string | number {
  return relation.documentId ?? relation.id;
}

export function sameRelation(
  left: StrapiRelation | null | undefined,
  right: StrapiRelation | null | undefined,
): boolean {
  if (!left || !right) return false;
  if (left.documentId !== undefined && right.documentId !== undefined) {
    return left.documentId === right.documentId;
  }
  return String(left.id) === String(right.id);
}

export function canManagePrograma(
  actor: ProgramaActor,
  programa: StrapiProgramaRecord,
): boolean {
  if (actor.role === 'super_admin') return true;
  if (actor.role === 'mentor') return sameRelation(programa.responsavel, actor.perfil);
  if (actor.role === 'instituicao') return sameRelation(programa.instituicao, actor.instituicao);
  return false;
}

export function canTransitionPrograma(
  current: string,
  next: string,
  role: Role,
): boolean {
  if (role === 'super_admin') return true;
  if (role === 'moderador') return current === 'published' && next === 'archived';
  if (role === 'mentor' || role === 'instituicao') {
    return (current === 'draft' && next === 'review')
      || (current === 'approved' && next === 'published')
      || (current === 'draft' && next === 'archived');
  }
  return false;
}
