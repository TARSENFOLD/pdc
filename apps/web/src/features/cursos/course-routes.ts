import type { Role } from '@pdc/shared';

export const COURSE_CATALOG_PATH = '/app/cursos';

export function canCreateCourses(role: Role | undefined): boolean {
  return role === 'mentor' || role === 'instituicao' || role === 'super_admin';
}

export function getCourseCreatorPaths(role: Role | undefined) {
  const creator = role === 'mentor' ? 'mentor' : 'instituicao';
  return {
    editor: `/app/${creator}/cursos`,
    library: `/app/${creator}/meus-cursos`,
  };
}

export function getCourseLibraryPath(role: Role | undefined): string {
  return canCreateCourses(role) ? getCourseCreatorPaths(role).library : '/app/meus-cursos';
}
