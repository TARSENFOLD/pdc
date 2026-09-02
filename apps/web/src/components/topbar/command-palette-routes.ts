import type { Role } from '@pdc/shared';

export interface NavCommand {
  label: string;
  to: string;
}

type CommandContentType = 'curso' | 'simulacao' | 'experiencia' | 'mentor' | 'instituicao' | 'perfil';

export const COMMAND_CONTENT_ROUTES: Record<CommandContentType, (slug: string) => string> = {
  curso: (slug) => `/app/cursos/${slug}`,
  simulacao: (slug) => `/app/simulacoes/${slug}`,
  experiencia: (slug) => `/app/experiencias/${slug}`,
  mentor: (id) => `/app/mentores/${id}`,
  instituicao: (id) => `/app/instituicoes/${id}`,
  perfil: (id) => `/app/perfil/${id}`,
};

export function getCommandContentRoute(tipo: string): ((slug: string) => string) | undefined {
  if (Object.prototype.hasOwnProperty.call(COMMAND_CONTENT_ROUTES, tipo)) {
    return COMMAND_CONTENT_ROUTES[tipo as CommandContentType];
  }
  return undefined;
}

export function getNavCommands(role: Role | undefined): NavCommand[] {
  const base: NavCommand[] = [
    { label: 'Início', to: '/app/home' },
    { label: 'Feed', to: '/app/feed' },
    { label: 'Simulações', to: '/app/simulacoes' },
    { label: 'Reputação', to: '/app/reputacao' },
    {
      label: role === 'instituicao' ? 'Perfil institucional' : 'Perfil',
      to: role === 'instituicao' ? '/app/instituicao/perfil/identidade' : '/app/perfil',
    },
    { label: 'Configurações', to: '/app/configuracoes' },
  ];

  const byRole: Record<Role, NavCommand[]> = {
    estudante: [
      { label: 'Dashboard Estudante', to: '/app/dashboard/estudante' },
      { label: 'Cursos', to: '/app/cursos' },
      { label: 'Certificados', to: '/app/certificados' },
      { label: 'Ranking', to: '/app/ranking' },
    ],
    mentor: [
      { label: 'Dashboard Mentor', to: '/app/dashboard/mentor' },
      { label: 'Criar Simulação', to: '/app/mentor/simulacoes/criar' },
      { label: 'Mentorias', to: '/app/mentorias' },
    ],
    instituicao: [
      { label: 'Dashboard Instituição', to: '/app/dashboard/instituicao' },
      { label: 'Gerir Cursos', to: '/app/instituicao/cursos' },
      { label: 'Criar Curso', to: '/app/instituicao/cursos/criar' },
      { label: 'Gerir Simulações', to: '/app/instituicao/simulacoes' },
      { label: 'Criar Simulação', to: '/app/instituicao/simulacoes/criar' },
      { label: 'Programas', to: '/app/instituicao/programas' },
      { label: 'Propostas', to: '/app/instituicao/propostas' },
      { label: 'Criar Experiência', to: '/app/instituicao/criar-experiencia' },
    ],
    moderador: [
      { label: 'Dashboard Moderador', to: '/app/dashboard/moderador' },
      { label: 'Denúncias', to: '/app/moderacao/denuncias' },
    ],
    super_admin: [
      { label: 'Dashboard Admin', to: '/app/dashboard/admin' },
      { label: 'Feature Flags', to: '/app/admin/feature-flags' },
      { label: 'Pesos do Feed', to: '/app/admin/feed-weights' },
      { label: 'LTI Plataformas', to: '/app/admin/lti' },
    ],
    comite_cientifico: [
      { label: 'Comité Científico', to: '/app/dashboard/comite' },
    ],
    patrocinador: [],
  };

  return [...base, ...(role ? byRole[role] : [])];
}
