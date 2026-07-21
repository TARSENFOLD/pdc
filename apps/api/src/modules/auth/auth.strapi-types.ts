import {
  type Conquista,
  type Role,
  RoleSchema,
  normalizeTipo,
} from '@pdc/shared';

export interface StrapiUser {
  id: number | string;
  email: string;
  username: string;
  nome?: string;
  confirmed?: boolean;
  role?: { name: string };
  avatar?: { url: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface StrapiUsersPermissionsRole {
  id: number | string;
  name: string;
  type: string;
}

export interface StrapiUsersPermissionsRolesResponse {
  roles: StrapiUsersPermissionsRole[];
}

export interface StrapiPerfilData {
  id?: string | number;
  documentId?: string;
  userId: string;
  nome?: string;
  tipo?: string;
  bio?: string | null;
  reputacao?: number;
  foto?: { url?: string } | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  areasInteresse?: string[];
  conquistas?: Conquista[];
  aprovado?: boolean | null;
  oauthVerified?: boolean | null;
  oauthProvider?: string | null;
  onboardingCompleto?: boolean | null;
  dataNascimento?: string | null;
  estadoMenoridade?: 'pendente' | 'adulto' | 'menor' | null;
  consentimentoEstado?: 'pendente' | 'completo' | 'requer_reconsentimento' | 'bloqueado' | null;
  consents?: unknown;
  instituicaoGerida?: { id: string | number; documentId?: string } | null;
}

export function resolveRole(strapiRoleName: string | undefined, perfilTipo: string | undefined): Role {
  if (perfilTipo) {
    const parsed = RoleSchema.safeParse(perfilTipo);
    if (parsed.success) return parsed.data;
  }
  if (strapiRoleName) {
    const lower = strapiRoleName.toLowerCase();
    if (lower === 'admin' || lower === 'super admin') return 'super_admin';
    return normalizeTipo(lower);
  }
  return 'estudante';
}
