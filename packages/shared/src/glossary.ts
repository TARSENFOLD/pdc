/**
 * Glossário SSOT — Fonte canónica de labels, slugs e keys de i18n.
 * Toda a UI, specs e cópia derivam daqui. Não editar strings noutros sítios.
 */

// ─── Roles ────────────────────────────────────────────────────────────────────

export const ROLE_SLUGS = [
  'estudante',
  'mentor',
  'instituicao',
  'moderador',
  'comite_cientifico',
  'super_admin',
  'patrocinador',
] as const;

export type RoleSlug = (typeof ROLE_SLUGS)[number];

export interface RoleLabel {
  'pt-PT': string;
  'pt-BR': string;
  en: string;
}

export const Roles: Record<RoleSlug, RoleLabel> = {
  estudante: {
    'pt-PT': 'Estudante',
    'pt-BR': 'Estudante',
    en: 'Student',
  },
  mentor: {
    'pt-PT': 'Mentor',
    'pt-BR': 'Mentor',
    en: 'Mentor',
  },
  instituicao: {
    'pt-PT': 'Instituição',
    'pt-BR': 'Instituição',
    en: 'Institution',
  },
  moderador: {
    'pt-PT': 'Moderador',
    'pt-BR': 'Moderador',
    en: 'Moderator',
  },
  comite_cientifico: {
    'pt-PT': 'Comité Científico',
    'pt-BR': 'Comitê Científico',
    en: 'Scientific Committee',
  },
  super_admin: {
    'pt-PT': 'Super Admin',
    'pt-BR': 'Super Admin',
    en: 'Super Admin',
  },
  patrocinador: {
    'pt-PT': 'Patrocinador',
    'pt-BR': 'Patrocinador',
    en: 'Sponsor',
  },
};

// ─── Content Types ─────────────────────────────────────────────────────────────

export const CONTENT_TYPE_SLUGS = [
  'curso',
  'simulacao',
  'experiencia',
  'programa',
  'projeto',
  'conquista',
  'post',
  'mentoria',
] as const;

export type ContentTypeSlug = (typeof CONTENT_TYPE_SLUGS)[number];

export interface ContentTypeLabel {
  'pt-PT': string;
  'pt-BR': string;
  en: string;
  plural: {
    'pt-PT': string;
    'pt-BR': string;
    en: string;
  };
}

export const ContentTypes: Record<ContentTypeSlug, ContentTypeLabel> = {
  curso: {
    'pt-PT': 'Curso',
    'pt-BR': 'Curso',
    en: 'Course',
    plural: { 'pt-PT': 'Cursos', 'pt-BR': 'Cursos', en: 'Courses' },
  },
  simulacao: {
    'pt-PT': 'Simulação',
    'pt-BR': 'Simulação',
    en: 'Simulation',
    plural: { 'pt-PT': 'Simulações', 'pt-BR': 'Simulações', en: 'Simulations' },
  },
  experiencia: {
    'pt-PT': 'Experiência',
    'pt-BR': 'Experiência',
    en: 'Experience',
    plural: { 'pt-PT': 'Experiências', 'pt-BR': 'Experiências', en: 'Experiences' },
  },
  programa: {
    'pt-PT': 'Programa',
    'pt-BR': 'Programa',
    en: 'Programme',
    plural: { 'pt-PT': 'Programas', 'pt-BR': 'Programas', en: 'Programmes' },
  },
  projeto: {
    'pt-PT': 'Projeto',
    'pt-BR': 'Projeto',
    en: 'Project',
    plural: { 'pt-PT': 'Projetos', 'pt-BR': 'Projetos', en: 'Projects' },
  },
  conquista: {
    'pt-PT': 'Conquista',
    'pt-BR': 'Conquista',
    en: 'Achievement',
    plural: { 'pt-PT': 'Conquistas', 'pt-BR': 'Conquistas', en: 'Achievements' },
  },
  post: {
    'pt-PT': 'Post',
    'pt-BR': 'Post',
    en: 'Post',
    plural: { 'pt-PT': 'Posts', 'pt-BR': 'Posts', en: 'Posts' },
  },
  mentoria: {
    'pt-PT': 'Mentoria',
    'pt-BR': 'Mentoria',
    en: 'Mentorship',
    plural: { 'pt-PT': 'Mentorias', 'pt-BR': 'Mentorias', en: 'Mentorships' },
  },
};

// ─── Nav Items ────────────────────────────────────────────────────────────────

export const NAV_ITEM_SLUGS = [
  'inicio',
  'meu_dashboard',
  'aprender',
  'explorar',
  'meu_futuro',
  'comunidade',
  'estudio_mentor',
  'gestao_institucional',
  'autoridade',
  'feed',
  'ranking',
  'vinculos',
  'projetos',
  'conquistas',
  'simulacoes',
  'cursos',
  'meus_cursos',
  'experiencias',
  'programas',
  'meus_programas',
  'catalogo',
  'relatorio_vocacional',
  'reputacao',
  'certificados',
  'gestao_cursos',
  'laboratorios',
  'vitrinas_curriculares',
  'roteiros',
  'auditoria_cientifica',
  'fila_aprovacoes',
  'aprovacoes_pendentes',
  'painel_admin',
] as const;

export type NavItemSlug = (typeof NAV_ITEM_SLUGS)[number];

export interface NavItemLabel {
  'pt-PT': string;
  'pt-BR': string;
  en: string;
}

export const NavItems: Record<NavItemSlug, NavItemLabel> = {
  inicio: { 'pt-PT': 'Início', 'pt-BR': 'Início', en: 'Home' },
  meu_dashboard: { 'pt-PT': 'Meu Dashboard', 'pt-BR': 'Meu Dashboard', en: 'My Dashboard' },
  aprender: { 'pt-PT': 'Aprender', 'pt-BR': 'Aprender', en: 'Learn' },
  explorar: { 'pt-PT': 'Explorar', 'pt-BR': 'Explorar', en: 'Explore' },
  meu_futuro: { 'pt-PT': 'Meu Futuro', 'pt-BR': 'Meu Futuro', en: 'My Future' },
  comunidade: { 'pt-PT': 'Comunidade', 'pt-BR': 'Comunidade', en: 'Community' },
  estudio_mentor: { 'pt-PT': 'Estúdio Mentor', 'pt-BR': 'Estúdio Mentor', en: 'Mentor Studio' },
  gestao_institucional: { 'pt-PT': 'Gestão Institucional', 'pt-BR': 'Gestão Institucional', en: 'Institutional Management' },
  autoridade: { 'pt-PT': 'Autoridade', 'pt-BR': 'Autoridade', en: 'Authority' },
  feed: { 'pt-PT': 'Feed de Mérito', 'pt-BR': 'Feed de Mérito', en: 'Merit Feed' },
  ranking: { 'pt-PT': 'Ranking', 'pt-BR': 'Ranking', en: 'Ranking' },
  vinculos: { 'pt-PT': 'Rede e Vínculos', 'pt-BR': 'Rede e Vínculos', en: 'Network & Bonds' },
  projetos: { 'pt-PT': 'Projetos', 'pt-BR': 'Projetos', en: 'Projects' },
  conquistas: { 'pt-PT': 'Conquistas', 'pt-BR': 'Conquistas', en: 'Achievements' },
  simulacoes: { 'pt-PT': 'Simulações', 'pt-BR': 'Simulações', en: 'Simulations' },
  cursos: { 'pt-PT': 'Cursos', 'pt-BR': 'Cursos', en: 'Courses' },
  meus_cursos: { 'pt-PT': 'Meus Cursos', 'pt-BR': 'Meus Cursos', en: 'My Courses' },
  experiencias: { 'pt-PT': 'Experiências', 'pt-BR': 'Experiências', en: 'Experiences' },
  programas: { 'pt-PT': 'Programas', 'pt-BR': 'Programas', en: 'Programmes' },
  meus_programas: { 'pt-PT': 'Meus Programas', 'pt-BR': 'Meus Programas', en: 'My Programmes' },
  catalogo: { 'pt-PT': 'Catálogo', 'pt-BR': 'Catálogo', en: 'Catalogue' },
  relatorio_vocacional: { 'pt-PT': 'Relatório Vocacional', 'pt-BR': 'Relatório Vocacional', en: 'Vocational Report' },
  reputacao: { 'pt-PT': 'Reputação', 'pt-BR': 'Reputação', en: 'Reputation' },
  certificados: { 'pt-PT': 'Certificados', 'pt-BR': 'Certificados', en: 'Certificates' },
  gestao_cursos: { 'pt-PT': 'Gestão de Cursos', 'pt-BR': 'Gestão de Cursos', en: 'Course Management' },
  laboratorios: { 'pt-PT': 'Laboratórios', 'pt-BR': 'Laboratórios', en: 'Laboratories' },
  vitrinas_curriculares: { 'pt-PT': 'Vitrinas Curriculares', 'pt-BR': 'Vitrinas Curriculares', en: 'Curricular Showcases' },
  roteiros: { 'pt-PT': 'Roteiros (Programas)', 'pt-BR': 'Roteiros (Programas)', en: 'Roadmaps (Programmes)' },
  auditoria_cientifica: { 'pt-PT': 'Auditoria Científica', 'pt-BR': 'Auditoria Científica', en: 'Scientific Audit' },
  fila_aprovacoes: { 'pt-PT': 'Fila de Aprovações', 'pt-BR': 'Fila de Aprovações', en: 'Approvals Queue' },
  aprovacoes_pendentes: { 'pt-PT': 'Aprovações Pendentes', 'pt-BR': 'Aprovações Pendentes', en: 'Pending Approvals' },
  painel_admin: { 'pt-PT': 'Painel Admin', 'pt-BR': 'Painel Admin', en: 'Admin Panel' },
};
