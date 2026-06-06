import { normalizeTipo, type Role } from '@pdc/shared';
import {
  strapiGet,
  strapiGetRaw,
  strapiPost,
  strapiPut,
  strapiPutRaw,
} from '../strapi/strapi.client.js';

interface StrapiUser {
  id: string | number;
  email: string;
  username?: string;
  nome?: string;
}

interface StrapiPerfil {
  id: string | number;
  documentId?: string;
  userId?: string;
  nome?: string;
  email?: string;
  tipo?: string;
}

const INTERNAL_FUNCTIONS: Partial<Record<Role, string>> = {
  moderador: 'Moderação',
  comite_cientifico: 'Validação Científica',
  super_admin: 'Operação Interna',
};

export interface CanonicalRoleUpdate {
  perfilId: string;
  oldRole: Role;
  newRole: Role;
}

export async function setCanonicalUserRole(userId: string, role: Role): Promise<CanonicalRoleUpdate> {
  const user = await strapiGetRaw<StrapiUser>(`/users/${userId}`);
  const perfilResponse = await strapiGet<StrapiPerfil>('/perfis', {
    'filters[userId][$eq]': userId,
    'pagination[pageSize]': '1',
  });
  const perfil = perfilResponse.data[0];
  const oldRole = normalizeTipo(perfil?.tipo ?? 'estudante');
  const funcao = INTERNAL_FUNCTIONS[role] ?? null;

  if (perfil) {
    const perfilId = String(perfil.documentId ?? perfil.id);
    await strapiPut(`/perfis/${perfilId}`, { tipo: role, funcao });
    return { perfilId: String(perfil.id), oldRole, newRole: role };
  }

  const created = await strapiPost<{ id: string | number }>('/perfis', {
    userId,
    nome: user.nome ?? user.username ?? user.email,
    email: user.email,
    tipo: role,
    funcao,
    ativo: true,
    aprovado: true,
    onboardingCompleto: true,
  });

  return {
    perfilId: String(created.data.id),
    oldRole,
    newRole: role,
  };
}

export async function resetInternalAccountPassword(userId: string, password: string): Promise<void> {
  await strapiPutRaw(`/users/${userId}`, {
    password,
    confirmed: true,
    blocked: false,
  });
}
