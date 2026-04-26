/**
 * Roles da plataforma PDC v2.
 * Cada role tem um conjunto de permissões definido no BFF.
 */
export const ROLES = [
  'estudante',
  'mentor',
  'instituicao',
  'moderador',
  'comite_cientifico',
  'super_admin',
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Hierarquia de roles (quanto maior, mais permissões).
 * Usado para verificações de autorização no frontend.
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  estudante: 1,
  mentor: 2,
  instituicao: 3,
  moderador: 4,
  comite_cientifico: 5,
  super_admin: 6,
};

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
